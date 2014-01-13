// JSPipe is free software distributed under the terms of the MIT license reproduced here.
// JSPipe may be used for any purpose, including commercial purposes, at absolutely no cost.
// No paperwork, no royalties, no GNU-like "copyleft" restrictions, either.
// Just download it and use it.

// Copyright (c) 2013 Joubert Nel

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.


var sentinel = '|Ω|';

function isGeneratorFunction(fn) {
    return true;
    // Don't do real checking yet, because it fails
    // in Firefox when using traceur for simulating
    // generators.
    // var fn = Function.isGenerator;
    // return fn && fn.call(x);
}

/**
 * Run a generator function `fn` as a concurrent job.
 *
 * #### Example:
 * ```
 * var pipe = new JSPipe.Pipe();
 *
 * JSPipe.job(function* () {
 *     pipe.send(1);
 * });
 *
 * JSPipe.job(function* () {
 *     while (true) {
 *         yield JSPipe.timeout(250).get();
 *         pipe.send(2);
 *     }
 * });
 *
 * JSPipe.job(function* () {
 *    while (true) {
 *        yield JSPipe.timeout(400).get();
 *        pipe.send(3);
 *    }
 * });
 *
 * JSPipe.job(function* () {
 *     var data;
 *     while (data = yield pipe.get()) {
 *         console.log(data);
 *     }
 * });
 * ```
 *
 * To communicate and synchronize between jobs, send data through a `Pipe`
 * using `put` (or `send`) and receive data using `get`.
 *
 * @param {Function} fn A generator function to execute as a concurrent job
 * @param {Array} args Parameters to pass to `fn`
 * @api public
 */
function job(fn, args) {
    var generator,
        next;

    if (isGeneratorFunction(fn)) {
        generator = fn.apply(fn, args);
        next = function(data) {
            var nextItem = generator.next(data),
                done = nextItem.done,
                value = nextItem.value,
                res;

            if (done) {
                res = null;
            } else {
                res = value ? value(next) : next();
            }

            return res;
        };
        next();
    } else {
        throw new TypeError('function must be a generator function, i.e. function* () {...} ');
    }
}

/**
 * A pipe provides a way for two jobs to communicate data and synchronize their execution.
 * One job can send data into the pipe by calling `yield pipe.put(data)` or `pipe.send(data)`
 * and another job can receive data by calling `yield pipe.get()`.
 *
 * Once both a sender job and a receiver job are waiting on the pipe a rendezvous occurs,
 * transferring the data in the pipe to the receiver and consequently synchronizing the two
 * waiting jobs.
 * 
 * Once synchronized, the two jobs continue execution.
 *
 * #### Example:
 * ```
 * var pipe = new Pipe();
 * ```
 *
 * @class Pipe
 * @constructor
 */
function Pipe() {
    this.syncing = false;
    this.inbox = [];
    this.outbox = [];
    this.isOpen = true;
}

(function(proto) {

    /**
     * Mark the pipe as closed.
     * 
     * @method Pipe.close
     */
    proto.close = function() {
        this.isOpen = false;
    };

    /**
     * Call `yield pipe.put(data)` from a job (the sender) to put data in the pipe.
     *
     * The put method will then try to rendezvous with a receiver job, if any.
     * If there is no receiver waiting for data, the sender will pause until another
     * job calls `yield pipe.get()`, which will then trigger a rendezvous.
     *
     * #### Example
     * ```
     * job(function* () {
     *     yield pipe.put(42);
     * });
     * ```
     *
     * @method Pipe.put
     * @param {AnyType} data The data to put into the pipe. 
     */
    proto.put = function(data) {
        var self = this;
        return function(resume) {
            self.inbox.push(data, resume);
            // Try to rendezvous with a receiver
            rendezvous(self);
        };
    };

    proto.waiting = function() {
        return this.outbox.length;
    };

    /**
     * Call `yield pipe.get()` from a job (the receiver) to get data from the pipe.
     *
     * The get method will then try to rendezvous with a sender job, if any.
     * If there is no sender waiting for the data it sent to be delivered, the receiver will
     * pause until another job calls `yield pipe.put(data)`, which will then trigger
     * a rendezvous.
     *
     * #### Example:
     * ```
     * job(function* () {
     *     var data;
     *     while (data = yield pipe.get()) {
     *         console.log(data);
     *     }
     * });
     * ```
     *
     * @method Pipe.get
     * @return {AnyType} The data that was received from the pipe.
     */
    proto.get = function() {
        var self = this;
        return function(resume) {
            self.outbox.push(resume);
            // Try to rendezvous with sender
            rendezvous(self);
        };
    };


    /**
     * Like `put`, but non-blocking. Unlike `put`, do not call with `yield`.
     *
     * #### Example:
     * ```
     * pipe.send(42);
     * ```
     * 
     * @method Pipe.send
     * @param {AnyType} data The data to put in the pipe.
     */
    proto.send = function(data) {
        this.put(data)();
    };


    function rendezvous(pipe) {
        var syncing = pipe.syncing,
            inbox = pipe.inbox,
            outbox = pipe.outbox,
            data,
            notify,
            send,
            receipt,
            senderWaiting,
            receiverWaiting;

        if (!syncing) {
            pipe.syncing = true;

            while ((senderWaiting = inbox.length > 0) &&
                   (receiverWaiting = outbox.length > 0)) {

                // Get the data that the sender job put in the pipe
                data = inbox.shift();

                // Get the method to notify the sender once the data has been
                // delivered to the receiver job
                notify = inbox.shift();

                // Get the method used to send the data to the receiver job.
                send = outbox.shift();

                // Send the data
                receipt = send(data);

                // Notify the sender that the data has been sent
                if (notify) {
                    notify(receipt);
                }
            }

            pipe.syncing = false;
        }
    }

})(Pipe.prototype);



function EventPipe(el, type, handler) {
    // super
    Pipe.call(this);

    this._el = el;
    this._type = type;
    this._handler = handler;
    el.addEventListener(type, handler);
}

EventPipe.prototype = Object.create(Pipe.prototype);

EventPipe.prototype.close = function() {
    this._el.removeEventListener(this._type, this._handler);
    delete this._el;
    delete this._type;
    delete this._handler;
    // super
    Pipe.prototype.close.call(this);
};



///
/// Pipe producers
///


function timeout(ms, interruptor) {
    // TODO: model timeout as a process
    var output = new Pipe();

    setTimeout(function() {
        output.send(ms);
        output.close();
    }, ms);

    return output;
}


function listen(el, type, preventDefault) {
    var handler = function(e) {
        if (preventDefault) {
            e.preventDefault();
        }
        output.send(e);
    };

    var output = new EventPipe(el, type, handler);
    return output;
}


function lazyseq(count, fn) {
    var output = new Pipe();
    job(function* () {
        var data,
            i = 0;
        while (0 < count--) {
            data = fn(i);
            yield output.put(data);
            i++;
        }

        yield output.put(sentinel);
        output.close();
    });
    return output;
}

///
/// Pipe transformers
///


function unique(pipe) {
    var output = new Pipe();

    job(function* () {
        var isFirstData = true,
            data,
            lastData;

        while (pipe.isOpen) {
            data = yield pipe.get();
            if (isFirstData || data !== lastData) {
                yield output.put(data);
                isFirstData = false;
            }
            lastData = data;
        }

        output.close();

    });

    return output;
}

function pace(ms, pipe) {
    var output = new Pipe();

    job(function* () {
        var timeoutId,
            data,
            send = function(data) { output.send(data); };

        while (pipe.isOpen) {
            data = yield pipe.get();
            clearTimeout(timeoutId);
            timeoutId = setTimeout(send.bind(output, data), ms);
        }

        output.close();

    });

    return output;
}

function delay(pipe, ms) {
    var output = new Pipe();
    job(function* () {
        var data;
        while (pipe.isOpen) {
            yield timeout(ms).get();
            data = yield pipe.get();
            output.send(data);
        }
    });

    return output;
}


///
/// Pipe coordination
///

function select(cases) {
    // TODO: consider rewriting as a sweetjs macro
    var output = new Pipe(),
        done = new Pipe(),
        remaining = cases.length;

    cases.forEach(function(item) {
        job(function* () {
            var pipe = item.pipe,
                response = item.response,
                data;
            data = yield pipe.get();
            response(data);
            yield done.put(true);
        });
    });

    job(function* () {
        while (remaining > 0) {
            yield done.get();
            remaining = remaining - 1;
        }
        yield output.put(sentinel);
    });

    return output;
}

function range() {
    // TODO: consider writing as a sweetjs macro
    throw 'Range has not been implemented yet.';
}


export {
    job,
    Pipe,
    EventPipe,

    // Pipe producers
    timeout,
    listen,
    lazyseq,

    // Pipe transformers
    unique,
    pace,
    delay,

    // Pipe coordination
    sentinel,
    select,
    range
};
