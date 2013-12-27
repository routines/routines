// Async.es is free software distributed under the terms of the MIT license reproduced here.
// Async-es may be used for any purpose, including commercial purposes, at absolutely no cost.
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

    if (global.async) {
        // Prevents from being executed multiple times.
        return;
    }


    function isGenerator(x) {
        var fn = Function.isGenerator;
        return fn ? fn.call(x) : true;
    }

    /**
     * Kick off a goroutine. A goroutine is a generator that runs concurrently
     * with other goroutines.
     *
     * To communicate and synchronize with another goroutine, communicate via a
     * Channel.
     */
    function go(routine, ...args) {
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
     * A channel provides a way for two goroutines to communicate data + synchronize their execution.
     *
     * One goroutine can send data by calling "yield channel.put(data)" and another goroutine can
     * receive data by calling "yield channel.get()".
     */
    class Channel {
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
         * Call "yield channel.put(data)" from a goroutine (the sender) to put data in the channel.
         *
         * The put method will then try to rendezvous with a receiver goroutine, if any.
         * If there is no receiver waiting for data, the sender will pause until another
         * goroutine calls "yield channel.get()", which will then trigger a rendezvous.
         */
        put(data) {
            return function(resume) {
                this.inbox.push(data, resume);
                // Try to rendezvous with a receiver
                this._rendezvous();
            }.bind(this);
        }

        /**
         * Call "yield channel.get()" from a goroutine (the receiver) to get data from the channel.
         *
         * The get method will then try to rendezvous with a sender goroutine, if any.
         * If there is no sender waiting for the data it sent to be delivered, the receiver will
         * pause until another goroutine calls "yield channel.put(data)", which will then trigger
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
         * A channel is a rendezvous point for two otherwise independently executing goroutines.
         * Such communication + synchronization on a channel requires a sender and receiver.
         &
         * A goroutine sends data to a channel using "yield channel.put(data)".
         * Another goroutine receives data from a channel using "yield channel.get()".
         *
         * Once both a sender goroutine and a receiver goroutine are waiting on the channel,
         * the _rendezvous method transfers the data in the channel to the receiver and consequently
         * synchronizes the two waiting goroutines.
         *
         *  Once synchronized, the two goroutines continue execution. 
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

                    // Get the data that the sender goroutine put in the channel
                    data = inbox.shift();
                    
                    // Get the method to notify the sender once the data has been
                    // delivered to the receiver goroutine
                    notify = inbox.shift();

                    // Get the method used to send the data to the receiver goroutine.
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


    class EventChannel extends Channel {
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
    /// Channel producers
    ///
    

    function timeout(ms, interruptor) {
        // TODO: model timeout as a process
        var output = new Channel();

        setTimeout(function() {
            go(function* () {
                yield output.put(ms);
            });
        }, ms);
        
        return output;
    }


    function listen(el, type) {
        var handler = (e) => {
                go(function* () {
                    yield output.put(e);
                });
        };

        var output = new EventChannel(el, type, handler);
        return output;
    }

    function jsonp(url) {
        var output = new Channel();
        $.getJSON(url, (data)=> {
            go(function* () {
                yield output.put(data);
            });
        });
        return output;
    }

    function lazyseq(count, fn, ...args) {
        var output = new Channel();
        go(function* () {
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
    /// Channel transformers
    ///
    

    function unique(channel) {
        var output = new Channel();
        
        go(function* () {
            var isFirstData = true,
                data,
                lastData;
            
            while (channel.isOpen) {
                data = yield channel.get();
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

    function pace(channel, ms) {
        var output = new Channel();
        
        go(function* () {
            var timeoutId,
                data;
            
            while (channel.isOpen) {
                data = yield channel.get();
                clearTimeout(timeoutId);

                timeoutId = setTimeout(() => {
                    go(function* () {
                        yield output.put(data);
                    });
                }, ms);
            }

            output.close();

        });

        return output;
    }

    
    ///
    /// Channel coordination
    ///

    function select(cases) {
        var done = new Channel(),
            remaining = cases.length,
            promise;

        promise = new Promise((resolve) => {

            cases.forEach(function(item) {
                go(function* () {
                    var channel = item.channel,
                        response = item.response,
                        data;
                    
                    data = yield channel.get();
                    response(data);
                    yield done.put(true);
                });
            });


            go(function* () {
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
    

    global.$async = {
        go: go,
        Channel: Channel,

        // Channel producers
        timeout: timeout,
        listen: listen,
        jsonp: jsonp,
        lazyseq: lazyseq,

        // Channel transformers
        unique: unique,
        pace: pace,

        // Channel coordination
        sentinel: sentinel,
        select: select, // Rewrite as syntax using sweet.js?
        range: null // Implement as syntax using sweet.js?
        
    };    


})(typeof global !== 'undefined' ? global : this);
