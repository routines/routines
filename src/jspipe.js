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
 * ##### Example:
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
 * @function job
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
 * ---
 */

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
 * ##### Example:
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
     * ##### Example
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
     * ##### Example:
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
     * ##### Example:
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


/**
 * ---
 */ 

/**
 * An EventPipe is a pipe for delivering event data.
 *
 * ##### Example:
 *
 * ```
 * var pipe = new EventPipe(document, 'keydown', function(evt) {
 *     pipe.send(evt);
 * });
 * ```
 *
 * Normally you should use the `listen` function to create an EventPipe instead.
 *
 * @class EventPipe
 * @constructor
 * @param {Object} el An object, such as an HTMLElement, that exposes an addEventListener method.
 * @param {String} type The name of the event, e.g. 'keydown'.
 * @param {Function} handler The function that is called when the event fires.
 */
function EventPipe(el, type, handler) {
    // super
    Pipe.call(this);

    this._el = el;
    this._type = type;
    this._handler = handler;
    el.addEventListener(type, handler);
}

EventPipe.prototype = Object.create(Pipe.prototype);

/**
 * Removes the event listener and closes the Pipe.
 * 
 * @method EventPipe.close
 */
EventPipe.prototype.close = function() {
    this._el.removeEventListener(this._type, this._handler);
    delete this._el;
    delete this._type;
    delete this._handler;
    // super
    Pipe.prototype.close.call(this);
};



/**
 * ---
 */
/// Pipe producers
///


/**
 * NOTE: will probably get renamed to `pause`.
 * 
 * Create a pipe that receives a value after a specified time. Use `timeout`
 * to pause a `job`. Other jobs get a chance to execute this job is paused. 
 *
 * ##### Example:
 *
 * ```
 * job(function* () {
 *     yield timeout(200).get();
 *     console.log('200ms elapsed');
 * });
 * ```
 * 
 * @function timeout
 * @param {Number} ms The time to wait before a value is placed in the pipe
 * @return {Pipe} A pipe
 */

function timeout(ms) { // TODO: consider renaming to "pause"
    // TODO: model timeout as a process
    var output = new Pipe();

    setTimeout(function() {
        output.send(ms);
        output.close();
    }, ms);

    return output;
}

/**
 * Create a `Pipe` that receives event data.
 *
 * ##### Example:
 *
 * ```
 * var pipe = listen(document, 'keydown');
 * var keydownEventData = yield pipe.get();
 * console.log(keydownEventData);
 * ```
 *
 * @function listen
 * @param {Object} el The object, such as an HTMLElement, on which to listen for events
 * @param {String} type The name of the event, e.g. 'keydown'
 * @param {Boolean} preventDefault Whether or not `.preventDefault()` should be called
 *                                 on the event data.
 * @return {Pipe} A pipe
 */

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

/**
 * Creates a pipe with `count` elements, each produced by executing the function `fn`.
 *
 * ##### Example:
 *
 * ```
 * var pipe = lazyseq(5, function(i) { return i * 10; });
 *
 * job(function* () {
 *     var data,
 *         result = [];
 *
 *     while (data = yield pipe.get()) {
 *         result.push(data);
 *     }
 * 
 *     console.log(result);
 * });
 * ```
 * Prints `[0, 10, 20, 30, 40]` to console.
 *
 * @function lazyseq
 * @param {Number} count The number of elements that should be produced
 * @param {Function} fn The function that produces each element. It is invoked with
 *                      with the element index
 */
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

/**
 * Creates a `Pipe` that will get the data produced by a callback-invoking NodeJS
 * function.
 * 
 * Useful for converting callback style code into sequential code.
 *
 * ##### Example:
 *
 * ```
 * job(function* () {
 *     var filedata = yield denode(fs.readFile, 'readme.txt');
 *     console.log(filedata);
 * });
 * ```
 *
 * @function denode
 * @param {Function} fn A node function that invokes a callback, e.g. fs.readFile
 * @param {Array} args The arguments to supply to `fn`
 */
function denode(fn, args) {
    var pipe = new Pipe(),
        newArgs = args instanceof Array ? args : [args];

    newArgs.push(function(err, data) {
        var result = err ? {err:err} : {data:data};
        pipe.send(result);
    });
    
    fn.apply(fn, newArgs);
    return pipe;
}
    

///
/// Pipe transformers
///


/**
 * NOTE: will be deprecated in favor of a generic filter function
 * 
 * Takes a pipe and produces a new pipe that only receives sequentially unique
 * values.
 *
 * ##### Example:
 *
 * ```
 * var pipe1 = new Pipe(),
 *     pipe2 = unique(pipe1);
 *
 * pipe1.send(1);
 * pipe1.send(1);
 * pipe1.send(3);
 * pipe1.send(1);
 *
 * job(function* () {
 *     var data,
 *         result = [];
 *     while (data = yield pipe2.get()) {
 *         result.push(data);
 *     }
 *     console.log(result);
 * });
 *
 * ```
 * Prints `[1, 3, 1]` to console.
 *
 * @function unique
 * @param {Pipe} pipe The pipe from which sequentially unique values must be produced
 * @return {Pipe} A Pipe
 */
function unique(pipe) { // TODO: swap out for generic filter
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

/**
 * Produces a new pipe that gets data from a source pipe at a given pace.
 * 
 * @function pace
 * @param {Number} ms The time to wait before getting the next value from the source pipe
 * @param {Pipe} pipe The source pipe
 * @return {Pipe} A pipe
 */
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

// TODO: remove
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

// TODO: revisit API
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
    denode,

    // Pipe transformers
    unique,
    pace,
    delay,

    // Pipe coordination
    sentinel,
    select,
    range
};
