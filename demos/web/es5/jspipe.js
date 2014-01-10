(function(global) {
if (global.JSPipe) { return; }
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
 * Kick off a job. A job runs concurrently with other jobs.
 *
 * To communicate and synchronize with another job, communicate via a
 * Pipe.
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
 * A pipe provides a way for two jobs to communicate data + synchronize their execution.
 *
 * One job can send data by calling "yield pipe.put(data)" and another job can
 * receive data by calling "yield pipe.get()".
 */
function Pipe() {
    this.syncing = false;
    this.inbox = [];
    this.outbox = [];
    this.isOpen = true;
}

Pipe.prototype.close = function() {
    this.isOpen = false;
};

/**
 * Call "yield pipe.put(data)" from a job (the sender) to put data in the pipe.
 *
 * The put method will then try to rendezvous with a receiver job, if any.
 * If there is no receiver waiting for data, the sender will pause until another
 * job calls "yield pipe.get()", which will then trigger a rendezvous.
 */
Pipe.prototype.put = function(data) {
    var self = this;
    return function(resume) {
        self.inbox.push(data, resume);
        // Try to rendezvous with a receiver
        self._rendezvous();
    };
};

Pipe.prototype.waiting = function() {
    return this.outbox.length;
};

/**
 * Call "yield pipe.get()" from a job (the receiver) to get data from the pipe.
 *
 * The get method will then try to rendezvous with a sender job, if any.
 * If there is no sender waiting for the data it sent to be delivered, the receiver will
 * pause until another job calls "yield pipe.put(data)", which will then trigger
 * a rendezvous.
 */
Pipe.prototype.get = function() {
    var self = this;
    return function(resume) {
        self.outbox.push(resume);
        // Try to rendezvous with sender
        self._rendezvous();
    };
};

Pipe.prototype.send = function(message) {
    this.put(message)();
};


/**
 * A pipe is a rendezvous point for two otherwise independently executing jobs.
 * Such communication + synchronization on a pipe requires a sender and receiver.
 *
 * A job sends data to a pipe using "yield pipe.put(data)".
 * Another job receives data from a pipe using "yield pipe.get()".
 *
 * Once both a sender job and a receiver job are waiting on the pipe,
 * the _rendezvous method transfers the data in the pipe to the receiver and consequently
 * synchronizes the two waiting jobs.
 *
 * Once synchronized, the two jobs continue execution.
 */
Pipe.prototype._rendezvous = function() {
    var syncing = this.syncing,
        inbox = this.inbox,
        outbox = this.outbox,
        data,
        notify,
        send,
        receipt,
        senderWaiting,
        receiverWaiting;

    if (!syncing) {
        this.syncing = true;

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

        this.syncing = false;
    }
};


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
        job(wrapGenerator.mark(function() {
            return wrapGenerator(function($ctx) {
                while (1) switch ($ctx.next) {
                case 0:
                    $ctx.next = 2;
                    return output.put(ms);
                case 2:
                case "end":
                    return $ctx.stop();
                }
            }, this);
        }));
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

function jsonp(url, id) {
    var output = new Pipe();
    $.getJSON(url, function(data) {
        job(wrapGenerator.mark(function() {
            return wrapGenerator(function($ctx) {
                while (1) switch ($ctx.next) {
                case 0:
                    $ctx.next = 2;

                    return output.put({ data: data,
                                       id: id })
                case 2:
                case "end":
                    return $ctx.stop();
                }
            }, this);
        }));
    });
    return output;
}


function lazyseq(count, fn) {
    var output = new Pipe();
    job(wrapGenerator.mark(function() {
        var data, i;

        return wrapGenerator(function($ctx) {
            while (1) switch ($ctx.next) {
            case 0:
                i = 0;
            case 1:
                if (!(0 < count--)) {
                    $ctx.next = 8;
                    break;
                }

                data = fn(i);
                $ctx.next = 5;
                return output.put(data);
            case 5:
                i++;
                $ctx.next = 1;
                break;
            case 8:
                $ctx.next = 10;
                return output.put(sentinel);
            case 10:
                output.close();
            case 11:
            case "end":
                return $ctx.stop();
            }
        }, this);
    }));
    return output;
}

///
/// Pipe transformers
///


function unique(pipe) {
    var output = new Pipe();

    job(wrapGenerator.mark(function() {
        var isFirstData, data, lastData;

        return wrapGenerator(function($ctx) {
            while (1) switch ($ctx.next) {
            case 0:
                isFirstData = true;
            case 1:
                if (!pipe.isOpen) {
                    $ctx.next = 12;
                    break;
                }

                $ctx.next = 4;
                return pipe.get();
            case 4:
                data = $ctx.sent;

                if (!(isFirstData || data !== lastData)) {
                    $ctx.next = 9;
                    break;
                }

                $ctx.next = 8;
                return output.put(data);
            case 8:
                isFirstData = false;
            case 9:
                lastData = data;
                $ctx.next = 1;
                break;
            case 12:
                output.close();
            case 13:
            case "end":
                return $ctx.stop();
            }
        }, this);
    }));

    return output;
}

function pace(ms, pipe) {
    var output = new Pipe();

    job(wrapGenerator.mark(function() {
        var timeoutId, data, send;

        return wrapGenerator(function($ctx) {
            while (1) switch ($ctx.next) {
            case 0:
                send = function(data) { output.send(data); };
            case 1:
                if (!pipe.isOpen) {
                    $ctx.next = 9;
                    break;
                }

                $ctx.next = 4;
                return pipe.get();
            case 4:
                data = $ctx.sent;
                clearTimeout(timeoutId);
                timeoutId = setTimeout(send.bind(output, data), ms);
                $ctx.next = 1;
                break;
            case 9:
                output.close();
            case 10:
            case "end":
                return $ctx.stop();
            }
        }, this);
    }));

    return output;
}

function delay(pipe, ms) {
    var output = new Pipe();
    job(wrapGenerator.mark(function() {
        var data;

        return wrapGenerator(function($ctx) {
            while (1) switch ($ctx.next) {
            case 0:
                if (!pipe.isOpen) {
                    $ctx.next = 9;
                    break;
                }

                $ctx.next = 3;
                return timeout(ms).get();
            case 3:
                $ctx.next = 5;
                return pipe.get();
            case 5:
                data = $ctx.sent;
                output.send(data);
                $ctx.next = 0;
                break;
            case 9:
            case "end":
                return $ctx.stop();
            }
        }, this);
    }));

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
        job(wrapGenerator.mark(function() {
            var pipe, response, data;

            return wrapGenerator(function($ctx) {
                while (1) switch ($ctx.next) {
                case 0:
                    pipe = item.pipe, response = item.response;
                    $ctx.next = 3;
                    return pipe.get();
                case 3:
                    data = $ctx.sent;
                    response(data);
                    $ctx.next = 7;
                    return done.put(true);
                case 7:
                case "end":
                    return $ctx.stop();
                }
            }, this);
        }));
    });

    job(wrapGenerator.mark(function() {
        return wrapGenerator(function($ctx) {
            while (1) switch ($ctx.next) {
            case 0:
                if (!(remaining > 0)) {
                    $ctx.next = 6;
                    break;
                }

                $ctx.next = 3;
                return done.get();
            case 3:
                remaining = remaining - 1;
                $ctx.next = 0;
                break;
            case 6:
                $ctx.next = 8;
                return output.put(sentinel);
            case 8:
            case "end":
                return $ctx.stop();
            }
        }, this);
    }));

    return output;
}

function range() {
    // TODO: consider writing as a sweetjs macro
    throw 'Range has not been implemented yet.';
}


global.JSPipe = {
    job: job,
    Pipe: Pipe,
    EventPipe: EventPipe,
    timeout: timeout,
    listen: listen,
    jsonp: jsonp,
    lazyseq: lazyseq,
    unique: unique,
    pace: pace,
    delay: delay,
    sentinel: sentinel,
    select: select,
    range: range
};

})(typeof global !== "undefined" ? global : this);