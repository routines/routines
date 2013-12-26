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

    if (global.async) {
        // Prevents from being executed multiple times.
        return;
    }


    function isGenerator(x) {
        var fn = Function.isGenerator;
        return fn ? fn.call(x) : true;
    }

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
            }
            next();                        
        } else {
            throw new TypeError('routine must be a generator');
        }
    }

    class Channel {
        constructor() {
            this.active = false;
            this.inbox = [];
            this.outbox = [];
            this.isOpen = true;
        }

        close() {
            // TODO: implement
            this.isOpen = false;
        }

        drain() {
            var { active, inbox, outbox } = this,
                message,
                deliver,
                send,
                receipt;

            if (!active) {
                this.active = true;

                while (inbox.length && outbox.length) {
                    message = inbox.shift();
                    deliver = inbox.shift();
                    send = outbox.shift();
                    receipt = send(message);
                    deliver && deliver(receipt);
                }

                this.active = false;
            }
        }

        put(message) {
            var channel = this;
            return function(resume) {
                channel.inbox.push(message, resume);
                channel.drain();
            };
        }

        receive() {
            var channel = this;
            return function(resume) {
                channel.outbox.push(resume);
                channel.drain();
            };
        }

        send(message) {
            this.put(message)();
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
            output.send(ms);
        }, ms);
        
        return output;
    }


    function listen(el, type) {
        var output = new EventChannel(el, type, (e) => {
            output.send(e);
        });

        return output;
    }

    function jsonp(url) {
        var output = new Channel();
        $.getJSON(url, output.send.bind(output));
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
                data = yield channel.receive();
                if (isFirstData || data !== lastData) {
                    output.send(data);
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
                data = yield channel.receive();
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    output.send(data);
                }, ms);
            }

            output.close();

        });

        return output;
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

        // Channel transformers
        unique: unique,
        pace: pace
        
    };    


})(typeof global !== 'undefined' ? global : this);