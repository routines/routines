// Routines is free software distributed under the terms of the MIT license reproduced here.
// Routines may be used for any purpose, including commercial purposes, at absolutely no cost.
// No paperwork, no royalties, no GNU-like "copyleft" restrictions, either.
// Just download it and use it.

// Copyright (c) 2013, 2014, 2015 Joubert Nel

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
 * # Running concurrent code
 */

/**
 * Run a generator function `fn` as a concurrent routine.
 *
 * ##### Example:
 * ```
 * var chan = new Routines.Chan();
 *
 * Routines.go(function* () {
 *     chan.send(1);
 * });
 *
 * Routines.go(function* () {
 *     while (true) {
 *         yield Routines.timeout(250).get();
 *         chan.send(2);
 *     }
 * });
 *
 * Routines.go(function* () {
 *    while (true) {
 *        yield Routines.timeout(400).get();
 *        chan.send(3);
 *    }
 * });
 *
 * Routines.go(function* () {
 *     var data;
 *     while (data = yield chan.get()) {
 *         console.log(data);
 *     }
 * });
 * ```
 *
 * To communicate and synchronize between routines, send data through a `Chan`
 * using `put` (or `send`) and receive data using `get`.
 *
 * @param {Function} fn A generator function to execute as a concurrent routine
 * @param {Array} args Parameters to pass to `fn`
 * @api public
 * @function go
 */
function go(fn, args) {
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
 * # Communicating & synchronizing between routines
 */

/**
 * A channel provides a way for two routines to communicate data and synchronize their execution.
 * One routine can send data into the channel by calling `yield chan.put(data)` or `chan.send(data)`
 * and another routine can receive data by calling `yield chan.get()`.
 *
 * Once both a sender routine and a receiver routine are waiting on the channel a rendezvous occurs,
 * transferring the data in the channel to the receiver and consequently synchronizing the two
 * waiting routines.
 *
 * Once synchronized, the two routines continue execution.
 *
 * ##### Example:
 * ```
 * var chan = new Chan();
 * ```
 *
 * @class Chan
 * @constructor
 */
function Chan() {
    this.syncing = false;
    this.inbox = [];
    this.outbox = [];
    this.isOpen = true;
}

(function(proto) {

    /**
     * Closes the channel and sets the `isOpen` flag to `false`.
     *
     * After a channel is closed you can no longer send messages to it.
     * Methods like `put`, `pushItems`, and `send` will throw an exception.
     *
     * @method Chan.close
     * @param {String} reason Optional. Provide a reason why the channel is getting closed.
     */
    proto.close = function(reason) {
        var methods = ['put', 'pushItems', 'send'],
            newMethodBody = function() { throw 'Channel is closed'; },
            self = this;
        this.send({close: reason});
        this.isOpen = false;
        methods.forEach(function(m) {
            Object.defineProperty(self, m, {
                configurable: false,
                enumerable: false,
                value: newMethodBody
            });
        });
        Object.freeze(this);

    };

    /**
     * Call `yield chan.put(data)` from a routine (the sender) to put data in the channel.
     *
     * The put method will then try to rendezvous with a receiver routine, if any.
     * If there is no receiver waiting for data, the sender will pause until another
     * routine calls `yield chan.get()`, which will then trigger a rendezvous.
     *
     * ##### Example
     * ```
     * go(function* () {
     *     yield chan.put(42);
     * });
     * ```
     *
     * @method Chan.put
     * @param {AnyType} data The data to put into the channel.
     */
    proto.put = function(data) {
        var self = this;
        return function(resume) {
            self.inbox.push(data, resume);
            // Try to rendezvous with a receiver
            rendezvous(self);
        };
    };

    /**
     * Puts the contents of `items` into the channel.
     *
     * By default the channel will be closed after the items are copied,
     * but can be determined by the optional `leaveOpen` parameter.
     *
     * Returns a channel which will close after the items are copied.
     *
     * ##### Example
     *
     * ```
     * chan.pushItems([1, 2, 3]);
     *
     * go(function* () {
     *     var msg,
     *         result = [];
     *
     *     while (!(msg = yield chan.get()).close) {
     *         result.push(msg.data);
     *     }
     *
     *     console.log(result);
     * });
     * ```
     * Prints `[1, 2, 3]` to console.
     *
     * @method Chan.pushItems
     * @param {Array} items The items to put in the channel
     * @param {Boolean} leaveOpen Optional. Control whether to leave channel open or not
     * @return {Chan} A channel that closes after the items are copied
     */
    proto.pushItems = function(items, leaveOpen) {
        var output = new Chan(),
            self = this;

        items.forEach(function(v) {
            self.send({data: v});
        });

        if (!leaveOpen) {
            this.close('pushItems');
        }

        output.close('pushItems');

        return output;
    };

    proto.waiting = function() {
        return this.outbox.length;
    };

    /**
     * Call `yield chan.get()` from a routine (the receiver) to get data from the chan.
     *
     * The get method will then try to rendezvous with a sender routine, if any.
     * If there is no sender waiting for the data it sent to be delivered, the receiver will
     * pause until another routine calls `yield chan.put(data)`, which will then trigger
     * a rendezvous.
     *
     * ##### Example:
     * ```
     * go(function* () {
     *     var data;
     *     while (data = yield chan.get()) {
     *         console.log(data);
     *     }
     * });
     * ```
     *
     * @method Chan.get
     * @return {AnyType} The data that was received from the channel.
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
     * chan.send(42);
     * ```
     *
     * @method Chan.send
     * @param {AnyType} data The data to put in the chan.
     */
    proto.send = function(data) {
        this.put(data)();
    };


    function rendezvous(chan) {
        var syncing = chan.syncing,
            inbox = chan.inbox,
            outbox = chan.outbox,
            data,
            notify,
            send,
            receipt,
            senderWaiting,
            receiverWaiting;

        if (!syncing) {
            chan.syncing = true;

            while ((senderWaiting = inbox.length > 0) &&
                   (receiverWaiting = outbox.length > 0)) {

                // Get the data that the sender routine put in the channel
                data = inbox.shift();

                // Get the method to notify the sender once the data has been
                // delivered to the receiver routine
                notify = inbox.shift();

                // Get the method used to send the data to the receiver routine.
                send = outbox.shift();

                // Send the data
                receipt = send(data);

                // Notify the sender that the data has been sent
                if (notify) {
                    notify(receipt);
                }
            }

            chan.syncing = false;
        }
    }

})(Chan.prototype);


/**
 * An EventChan is a channel for delivering event data.
 *
 * ##### Example:
 *
 * ```
 * var chan = new EventChan(document, 'keydown', function(evt) {
 *     chan.send(evt);
 * });
 * ```
 *
 * Normally you should use the `listen` function to create an EventChan instead.
 *
 * @class EventChan
 * @constructor
 * @param {Object} el An object, such as an HTMLElement, that exposes an addEventListener method.
 * @param {String} type The name of the event, e.g. 'keydown'.
 * @param {Function} handler The function that is called when the event fires.
 */
function EventChan(el, type, handler) {
    // super
    Chan.call(this);

    this._el = el;
    this._type = type;
    this._handler = handler;
    el.addEventListener(type, handler);
}

EventChan.prototype = Object.create(Chan.prototype);

/**
 * Removes the event listener and closes the Chan.
 *
 * @method EventChan.close
 */
EventChan.prototype.close = function() {
    this._el.removeEventListener(this._type, this._handler);
    delete this._el;
    delete this._type;
    delete this._handler;
    // super
    Chan.prototype.close.call(this);
};



/**
 * ---
 * # Making channels
 */


/**
 * NOTE: will probably get renamed to `pause`.
 *
 * Create a channel that receives a value after a specified time. Use `timeout`
 * to pause a `routine`. Other routiness get a chance to execute this routine is paused.
 *
 * ##### Example:
 *
 * ```
 * go(function* () {
 *     yield timeout(200).get();
 *     console.log('200ms elapsed');
 * });
 * ```
 *
 * @function timeout
 * @param {Number} ms The time to wait before a value is placed in the channel
 * @return {Chan} A channel
 */

function timeout(ms) { // TODO: consider renaming to "pause"
    // TODO: model timeout as a process
    var output = new Chan();

    setTimeout(function() {
        output.send(ms);
        output.close();
    }, ms);

    return output;
}

/**
 * Create a `Chan` that receives event data.
 *
 * ##### Example:
 *
 * ```
 * var chan = listen(document, 'keydown');
 * var keydownEventData = yield chan.get();
 * console.log(keydownEventData);
 * ```
 *
 * @function listen
 * @param {Object} el The object, such as an HTMLElement, on which to listen for events
 * @param {String} type The name of the event, e.g. 'keydown'
 * @param {Boolean} preventDefault Whether or not `.preventDefault()` should be called
 *                                 on the event data.
 * @return {Chan} A channel
 */

function listen(el, type, preventDefault) {
    var handler = function(e) {
        if (preventDefault) {
            e.preventDefault();
        }
        output.send(e);
    };

    var output = new EventChan(el, type, handler);
    return output;
}

/**
 * Creates a channel with `count` elements, each produced by executing the function `fn`.
 *
 * ##### Example:
 *
 * ```
 * var chan = lazyseq(5, function(i) { return i * 10; });
 *
 * go(function* () {
 *     var msg,
 *         result = [];
 *
 *     while (!(data = yield chan.get()).close) {
 *         result.push(msg.data);
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
    var output = new Chan();
    go(function* () {
        var data,
            i = 0;
        while (0 < count--) {
            data = fn(i);
            yield output.put({data: data});
            i++;
        }

        output.close('lazyseq');
    });
    return output;
}

/**
 * Creates a `Chan` that will get the data produced by a callback-invoking NodeJS
 * function. The channel receives a `{data: ...}` or a `{err: ...}` message, and is
 * then closed.
 *
 * Useful for converting callback style code into sequential code.
 *
 * ##### Example:
 *
 * ```
 * go(function* () {
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
    var chan = new Chan(),
        newArgs = args instanceof Array ? args : [args];

    newArgs.push(function(err, data) {
        var result = err ? {err:err} : {data:data};
        chan.send(result);
        chan.close('denode');
    });

    fn.apply(fn, newArgs);
    return chan;
}


/**
 * ---
 * ## Transforming channels
 */

/**
 * Takes a channel and produces a new channel that only receives sequentially unique
 * values.
 *
 * ##### Example:
 *
 * ```
 * var chan1 = new Chan(),
 *     chan2 = unique(chan1);
 *
 * chan1.send(1);
 * chan1.send(1);
 * chan1.send(3);
 * chan1.send(1);
 *
 * go(function* () {
 *     var data,
 *         result = [];
 *     while (data = yield chan2.get()) {
 *         result.push(data);
 *     }
 *     console.log(result);
 * });
 *
 * ```
 * Prints `[1, 3, 1]` to console.
 *
 * @function unique
 * @param {Chan} chan The channel from which sequentially unique values must be produced
 * @return {Chan} A channel
 */
function unique(chan) {
    var output = new Chan();

    go(function* () {
        var isFirstData = true,
            data,
            lastData;

        while (!(data = yield chan.get()).close) {
            if (isFirstData || data !== lastData) {
                yield output.put(data);
                isFirstData = false;
            }
            lastData = data;
        }

        output.close('unique');

    });

    return output;
}

/**
 * Produces a new channel that gets data from a source channel at a given pace.
 *
 * @function pace
 * @param {Number} ms The time to wait before getting the next value from the source channel
 * @param {Chan} chan The source channel
 * @return {Chan} A channel
 */
function pace(ms, chan) {
    var output = new Chan();

    go(function* () {
        var timeoutId,
            data,
            send = function(data) { output.send(data); };

        while (!(data = yield chan.get()).close) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(send.bind(output, data), ms);
        }

        output.close();

    });

    return output;
}



///
/// Channel coordination
///

// TODO: revisit API
function select(cases) {
    // TODO: consider rewriting as a sweetjs macro
    var output = new Chan(),
        done = new Chan(),
        remaining = cases.length;

    cases.forEach(function(item) {
        go(function* () {
            var chan = item.chan,
                response = item.response,
                data;
            data = yield chan.get();
            response(data);
            yield done.put(true);
        });
    });

    go(function* () {
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
    go,
    Chan,
    EventChan,

    // Channel producers
    timeout,
    listen,
    lazyseq,
    denode,

    // Channel transformers
    unique,
    pace,

    // Channel coordination
    sentinel,
    select,
    range
};
