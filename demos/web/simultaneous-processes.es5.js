function main(Pipe, job, timeout) {
    var pipe = new Pipe(),
        out = document.getElementById('out');

    function render(q) {
        return q.map(function(p) {
            return '<div class="proc-' + p + '">Process ' + p + '</div>';
        }).join('');
    }

    function peekn(array, n) {
        var len = array.length,
            res = len > n ? array.slice(len - n) : array;
        return res;
    }

    // Process 1
    job(wrapGenerator.mark(function() {
        return wrapGenerator(function($ctx) {
            while (1) switch ($ctx.next) {
            case 0:
                if (!true) {
                    $ctx.next = 7;
                    break;
                }

                $ctx.next = 3;
                return timeout(250).get();
            case 3:
                $ctx.next = 5;
                return pipe.put(1);
            case 5:
                $ctx.next = 0;
                break;
            case 7:
            case "end":
                return $ctx.stop();
            }
        }, this);
    }));

    // Process 2
    job(wrapGenerator.mark(function() {
        return wrapGenerator(function($ctx) {
            while (1) switch ($ctx.next) {
            case 0:
                if (!true) {
                    $ctx.next = 7;
                    break;
                }

                $ctx.next = 3;
                return timeout(1000).get();
            case 3:
                $ctx.next = 5;
                return pipe.put(2);
            case 5:
                $ctx.next = 0;
                break;
            case 7:
            case "end":
                return $ctx.stop();
            }
        }, this);
    }));

    
    // Process 3
    job(wrapGenerator.mark(function() {
        return wrapGenerator(function($ctx) {
            while (1) switch ($ctx.next) {
            case 0:
                if (!true) {
                    $ctx.next = 7;
                    break;
                }

                $ctx.next = 3;
                return timeout(1500).get();
            case 3:
                $ctx.next = 5;
                return pipe.put(3);
            case 5:
                $ctx.next = 0;
                break;
            case 7:
            case "end":
                return $ctx.stop();
            }
        }, this);
    }));


    // Render 10 most recent items from the 3 simultaneous processes
    job(wrapGenerator.mark(function() {
        var data, newItem;

        return wrapGenerator(function($ctx) {
            while (1) switch ($ctx.next) {
            case 0:
                data = [];
            case 1:
                if (!true) {
                    $ctx.next = 10;
                    break;
                }

                out.innerHTML = render(data);
                $ctx.next = 5;
                return pipe.get();
            case 5:
                newItem = $ctx.sent;
                data.push(newItem);
                data = peekn(data, 10);
                $ctx.next = 1;
                break;
            case 10:
            case "end":
                return $ctx.stop();
            }
        }, this);
    }));

}
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


// (function(global) {
//     'use strict';

//     var sentinel = '|Ω|';

//     if (global.Pipe) {
//         // Prevents from being executed multiple times.
//         return;
//     }


//     function isGenerator(x) {
//         return true;
//         // Don't do real checking yet, because it fails
//         // in Firefox when using traceur for simulating
//         // generators.
//         // var fn = Function.isGenerator;
//         // return fn && fn.call(x);
//     }

//     /**
//      * Kick off a job. A job is a generator that runs concurrently
//      * with other jobs.
//      *
//      * To communicate and synchronize with another job, communicate via a
//      * Pipe.
//      */
//     function job(routine, args) {
//         var task,
//             next;

//         if (isGenerator(routine)) {
//             task = routine.apply(routine, args);
//             next = function(data) {
//                 var nextItem = task.next(data),
//                     done = nextItem.done,
//                     value = nextItem.value,
//                     res;

//                 if (done) {
//                     res = null;
//                 } else {
//                     res = value ? value(next) : next();
//                 }

//                 return res;
//             };
//             next();                        
//         } else {
//             throw new TypeError('routine must be a generator');
//         }
//     }

//     /**
//      * A pipe provides a way for two jobs to communicate data + synchronize their execution.
//      *
//      * One job can send data by calling "yield pipe.put(data)" and another job can
//      * receive data by calling "yield pipe.get()".
//      */

//     function Pipe() {
//         this.syncing = false;
//         this.inbox = [];
//         this.outbox = [];
//         this.isOpen = true;
//     }

//     Pipe.prototype.close = function() {
//         this.isOpen = false;
//     };

//     Pipe.prototype.put = function(data) {
//         return function(resume) {
//             this.inbox.push(data, resume);
//             // Try to rendezvous with a receiver
//             this._rendezvous();
//         }.bind(this);
//     };

//     Pipe.prototype.get = function() {
//         return function(resume) {
//             this.outbox.push(resume);
//             // Try to rendezvous with sender
//             this._rendezvous();
//         }.bind(this);
//     };

//     Pipe.prototype._rendezvous = function() {
//         var syncing = this.syncing,
//             inbox = this.inbox,
//             outbox = this.outbox,
//             data,
//             notify,
//             send,
//             receipt,
//             senderWaiting,
//             receiverWaiting;

//         if (!syncing) {
//             this.syncing = true;

//             while ((senderWaiting = inbox.length > 0) &&
//                    (receiverWaiting = outbox.length > 0)) {  

//                 // Get the data that the sender job put in the pipe
//                 data = inbox.shift();
                
//                 // Get the method to notify the sender once the data has been
//                 // delivered to the receiver job
//                 notify = inbox.shift();

//                 // Get the method used to send the data to the receiver job.
//                 send = outbox.shift();
                
//                 // Send the data
//                 receipt = send(data);

//                 // Notify the sender that the data has been sent
//                 notify && notify(receipt);
//             }

//             this.syncing = false;
//         }
//     };
    

//     function EventPipe(el, type, handler) {
//         // super
//         Pipe.call(this);        

//         this._el = el;
//         this._type = type;
//         this._handler = handler;
//         el.addEventListener(type, handler);
//     }

//     EventPipe.prototype = Object.create(Pipe.prototype);

//     EventPipe.prototype.close = function() {
//         this._el.removeEventListener(this._type, this._handler);
//         delete this._el;
//         delete this._type;
//         delete this._handler;
//         // super
//         Pipe.prototype.close.call(this);        
//     };

    

    
//     ///
//     /// Pipe producers
//     ///
    

//     function timeout(ms, interruptor) {
//         // TODO: model timeout as a process
//         var output = new Pipe();

//         setTimeout(function() {
//             job(function* () {
//                 yield output.put(ms);
//             });
//         }, ms);
        
//         return output;
//     }

    
//     ///
//     /// Exports
//     ///
    

//     global.JSPipe = {
//         job: job,
//         Pipe: Pipe,

//         // Pipe producers
//         timeout: timeout
//     };    


// })(typeof global !== 'undefined' ? global : this);



main(JSPipe.Pipe, JSPipe.job, JSPipe.timeout);
