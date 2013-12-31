function main({Pipe, job, select, timeout, sentinel, lazyseq}) {

    job(function* () {

        var sorted = new Pipe(),
            log = new Pipe(),
            numbers = new Pipe(),
            randomNumber = (index) => { return Math.random(); };

        job(printLogMessages);
        job(receiveNumbers, lazyseq(100000, randomNumber));
        job(sortNumbers);
        
        var [ sortedNumbers, sortTime ] = yield sorted.get();        

        
        yield log.put('sort complete. took ' + sortTime + 'ms for ' + sortedNumbers.length + ' items.');
        yield log.put('first: ' + sortedNumbers[0]);
        yield log.put('last: ' + sortedNumbers[sortedNumbers.length-1]);

        
        ///
        /// Jobs
        ///


        function* printLogMessages() {
            var text, p,
                logDiv = document.getElementById('log');
            
            while (true) {                
                text = yield log.get(),
                p = document.createElement('p');
                p.innerHTML = text;
                logDiv.appendChild(p);            
            }
        }

        function* receiveNumbers(channel) {
            var all = false,
                nums = [],
                start = Date.now(),
                n;

            // TODO: this while loop is the logic
            // for Range syntax; implement it using sweetjs
            // and make part of core Async-es library.
            while (!all) {
                n = yield channel.get();
                if (n === sentinel) {
                    all = true;
                } else {
                    nums.push(n);
                }
            }

            yield log.put('took ' + (Date.now() - start) + 'ms to receive ' + nums.length + ' random numbers');
            yield numbers.put(nums);
        }

        function* sortNumbers() {
            var nums,
                start,
                end;

            nums = yield numbers.get();
            start = Date.now();
            nums.sort();
            end = Date.now();
            yield sorted.put([nums, end - start]);
        }

    });

};
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


(function(global) {
    'use strict';

    var sentinel = Symbol('Ω');

    if (global.Pipe) {
        // Prevents from being executed multiple times.
        return;
    }


    function isGenerator(x) {
        return true;
        // Don't do real checking yet, because it fails
        // in Firefox when using traceur for simulating
        // generators.
        // var fn = Function.isGenerator;
        // return fn && fn.call(x);
    }

    /**
     * Kick off a job. A job is a generator that runs concurrently
     * with other jobs.
     *
     * To communicate and synchronize with another job, communicate via a
     * Pipe.
     */
    function job(routine, ...args) {
        var task,
            next;

        if (isGenerator(routine)) {
            task = routine(...args);
            next = (data) => {
                var {done, value} = task.next(data),
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
            throw new TypeError('routine must be a generator');
        }
    }

    /**
     * A pipe provides a way for two jobs to communicate data + synchronize their execution.
     *
     * One job can send data by calling "yield pipe.put(data)" and another job can
     * receive data by calling "yield pipe.get()".
     */
    class Pipe {
        constructor() {
            this.synching = false;
            this.inbox = [];
            this.outbox = [];
            this.isOpen = true;
        }

        close() {
            // TODO: implement
            this.isOpen = false;
        }

        /**
         * Call "yield pipe.put(data)" from a job (the sender) to put data in the pipe.
         *
         * The put method will then try to rendezvous with a receiver job, if any.
         * If there is no receiver waiting for data, the sender will pause until another
         * job calls "yield pipe.get()", which will then trigger a rendezvous.
         */
        put(data) {
            return function(resume) {
                this.inbox.push(data, resume);
                // Try to rendezvous with a receiver
                this._rendezvous();
            }.bind(this);
        }

        /**
         * Call "yield pipe.get()" from a job (the receiver) to get data from the pipe.
         *
         * The get method will then try to rendezvous with a sender job, if any.
         * If there is no sender waiting for the data it sent to be delivered, the receiver will
         * pause until another job calls "yield pipe.put(data)", which will then trigger
         * a rendezvous.
         */
        get() {
            return function(resume) {
                this.outbox.push(resume);
                // Try to rendezvous with a sender
                this._rendezvous();
            }.bind(this);
        }

        /**
         * A pipe is a rendezvous point for two otherwise independently executing jobs.
         * Such communication + synchronization on a pipe requires a sender and receiver.
         &
         * A job sends data to a pipe using "yield pipe.put(data)".
         * Another job receives data from a pipe using "yield pipe.get()".
         *
         * Once both a sender job and a receiver job are waiting on the pipe,
         * the _rendezvous method transfers the data in the pipe to the receiver and consequently
         * synchronizes the two waiting jobs.
         *
         *  Once synchronized, the two jobs continue execution. 
         */
        _rendezvous() {
            var { synching, inbox, outbox } = this,
                data,
                notify,
                send,
                receipt,
                senderWaiting,
                receiverWaiting;

            if (!synching) {
                this.synching = true;

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
                    notify && notify(receipt);
                }

                this.synching = false;
            }
        }

    }


    class EventPipe extends Pipe {
        constructor(el, type, handler) {
            el.addEventListener(type, handler);
            super();
        }

        close() {
            el.removeEventListener(type, handler);
            super();
        }
    }

    
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
        var handler = (e) => {
                job(function* () {
                    yield output.put(e);
                });
        };

        var output = new EventPipe(el, type, handler);
        return output;
    }

    function jsonp(url) {
        var output = new Pipe();
        $.getJSON(url, (data)=> {
            job(function* () {
                yield output.put(data);
            });
        });
        return output;
    }

    function lazyseq(count, fn, ...args) {
        var output = new Pipe();
        job(function* () {
            var data,
                i = 0;
            while (0 < count--) {
                data = fn(i, args);
                yield output.put(data);
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

    function pace(pipe, ms) {
        var output = new Pipe();
        
        job(function* () {
            var timeoutId,
                data;
            
            while (pipe.isOpen) {
                data = yield pipe.get();
                clearTimeout(timeoutId);

                timeoutId = setTimeout(() => {
                    job(function* () {
                        yield output.put(data);
                    });
                }, ms);
            }

            output.close();

        });

        return output;
    }

    
    ///
    /// Pipe coordination
    ///

    function select(cases) {
        var done = new Pipe(),
            remaining = cases.length,
            promise;

        promise = new Promise((resolve) => {

            cases.forEach(function(item) {
                job(function* () {
                    var { pipe, response } = item,
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
                resolve(true);
            });
        });

        return promise;
    }

    
    ///
    /// Exports
    ///
    

    global.Pipe = {
        job: job,
        Pipe: Pipe,

        // Pipe producers
        timeout: timeout,
        listen: listen,
        jsonp: jsonp,
        lazyseq: lazyseq,

        // Pipe transformers
        unique: unique,
        pace: pace,

        // Pipe coordination
        sentinel: sentinel,
        select: select, // Rewrite as syntax using sweet.js?
        range: null // Implement as syntax using sweet.js?
        
    };    


})(typeof global !== 'undefined' ? global : this);


main(Pipe);



