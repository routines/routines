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
    return function(resume) {
        this.inbox.push(data, resume);
        // Try to rendezvous with a receiver
        this._rendezvous();
    }.bind(this);
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
    return function(resume) {
        this.outbox.push(resume);
        // Try to rendezvous with sender
        this._rendezvous();
    }.bind(this);
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
        job(function* () {
            yield output.put(ms);
        });
    }, ms);
    
    return output;
}


function listen(el, type) {
    var handler = function(e) {
        job(function* () {
            yield output.put(e);
        });
    };

    var output = new EventPipe(el, type, handler);
    return output;
}

function jsonp(url, id) {
    var output = new Pipe();
    $.getJSON(url, function(data) {
        job(function* () {
            yield output.put({ data: data,
                               id: id });
        });
    });
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
    jsonp,
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
