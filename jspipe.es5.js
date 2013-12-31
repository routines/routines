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


(function(
  // Reliable reference to the global object (i.e. window in browsers).
  global,

  // Dummy constructor that we use as the .constructor property for
  // functions that return Generator objects.
  GeneratorFunction
) {
  var hasOwn = Object.prototype.hasOwnProperty;

  if (global.wrapGenerator) {
    return;
  }

  function wrapGenerator(innerFn, self) {
    return new Generator(innerFn, self || null);
  }

  global.wrapGenerator = wrapGenerator;
  if (typeof exports !== "undefined") {
    exports.wrapGenerator = wrapGenerator;
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  wrapGenerator.mark = function(genFun) {
    genFun.constructor = GeneratorFunction;
    return genFun;
  };

  // Ensure isGeneratorFunction works when Function#name not supported.
  if (GeneratorFunction.name !== "GeneratorFunction") {
    GeneratorFunction.name = "GeneratorFunction";
  }

  wrapGenerator.isGeneratorFunction = function(genFun) {
    var ctor = genFun && genFun.constructor;
    return ctor ? GeneratorFunction.name === ctor.name : false;
  };

  function Generator(innerFn, self) {
    var generator = this;
    var context = new Context();
    var state = GenStateSuspendedStart;

    function invoke() {
      state = GenStateExecuting;
      do {
        var value = innerFn.call(self, context);
      } while (value === ContinueSentinel);
      // If an exception is thrown from innerFn, we leave state ===
      // GenStateExecuting and loop back for another invocation.
      state = context.done
        ? GenStateCompleted
        : GenStateSuspendedYield;
      return { value: value, done: context.done };
    }

    function assertCanInvoke() {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        throw new Error("Generator has already finished");
      }
    }

    function handleDelegate(method, arg) {
      var delegate = context.delegate;
      if (delegate) {
        try {
          var info = delegate.generator[method](arg);
        } catch (uncaught) {
          context.delegate = null;
          return generator.throw(uncaught);
        }

        if (info) {
          if (info.done) {
            context[delegate.resultName] = info.value;
            context.next = delegate.nextLoc;
          } else {
            return info;
          }
        }

        context.delegate = null;
      }
    }

    generator.next = function(value) {
      assertCanInvoke();

      var delegateInfo = handleDelegate("next", value);
      if (delegateInfo) {
        return delegateInfo;
      }

      if (state === GenStateSuspendedYield) {
        context.sent = value;
      }

      while (true) try {
        return invoke();
      } catch (exception) {
        context.dispatchException(exception);
      }
    };

    generator.throw = function(exception) {
      assertCanInvoke();

      var delegateInfo = handleDelegate("throw", exception);
      if (delegateInfo) {
        return delegateInfo;
      }

      if (state === GenStateSuspendedStart) {
        state = GenStateCompleted;
        throw exception;
      }

      while (true) {
        context.dispatchException(exception);
        try {
          return invoke();
        } catch (thrown) {
          exception = thrown;
        }
      }
    };
  }

  Generator.prototype.toString = function() {
    return "[object Generator]";
  };

  function Context() {
    this.reset();
  }

  Context.prototype = {
    constructor: Context,

    reset: function() {
      this.next = 0;
      this.sent = void 0;
      this.tryStack = [];
      this.done = false;
      this.delegate = null;

      // Pre-initialize at least 20 temporary variables to enable hidden
      // class optimizations for simple generators.
      for (var tempIndex = 0, tempName;
           hasOwn.call(this, tempName = "t" + tempIndex) || tempIndex < 20;
           ++tempIndex) {
        this[tempName] = null;
      }
    },

    stop: function() {
      this.done = true;

      if (hasOwn.call(this, "thrown")) {
        var thrown = this.thrown;
        delete this.thrown;
        throw thrown;
      }

      return this.rval;
    },

    keys: function(object) {
      return Object.keys(object).reverse();
    },

    pushTry: function(catchLoc, finallyLoc, finallyTempVar) {
      if (finallyLoc) {
        this.tryStack.push({
          finallyLoc: finallyLoc,
          finallyTempVar: finallyTempVar
        });
      }

      if (catchLoc) {
        this.tryStack.push({
          catchLoc: catchLoc
        });
      }
    },

    popCatch: function(catchLoc) {
      var lastIndex = this.tryStack.length - 1;
      var entry = this.tryStack[lastIndex];

      if (entry && entry.catchLoc === catchLoc) {
        this.tryStack.length = lastIndex;
      }
    },

    popFinally: function(finallyLoc) {
      var lastIndex = this.tryStack.length - 1;
      var entry = this.tryStack[lastIndex];

      if (!entry || !hasOwn.call(entry, "finallyLoc")) {
        entry = this.tryStack[--lastIndex];
      }

      if (entry && entry.finallyLoc === finallyLoc) {
        this.tryStack.length = lastIndex;
      }
    },

    dispatchException: function(exception) {
      var finallyEntries = [];
      var dispatched = false;

      if (this.done) {
        throw exception;
      }

      // Dispatch the exception to the "end" location by default.
      this.thrown = exception;
      this.next = "end";

      for (var i = this.tryStack.length - 1; i >= 0; --i) {
        var entry = this.tryStack[i];
        if (entry.catchLoc) {
          this.next = entry.catchLoc;
          dispatched = true;
          break;
        } else if (entry.finallyLoc) {
          finallyEntries.push(entry);
          dispatched = true;
        }
      }

      while ((entry = finallyEntries.pop())) {
        this[entry.finallyTempVar] = this.next;
        this.next = entry.finallyLoc;
      }
    },

    delegateYield: function(generator, resultName, nextLoc) {
      var info = generator.next(this.sent);

      if (info.done) {
        this.delegate = null;
        this[resultName] = info.value;
        this.next = nextLoc;

        return ContinueSentinel;
      }

      this.delegate = {
        generator: generator,
        resultName: resultName,
        nextLoc: nextLoc
      };

      return info.value;
    }
  };
}).apply(this, Function("return [this, function GeneratorFunction(){}]")());

(function(global) {
    'use strict';

    var sentinel = '|Ω|';

    if (global.JSPipe) {
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
    function job(routine, args) {
        var task,
            next;

        if (isGenerator(routine)) {
            task = routine.apply(routine, args);
            next = function(data) {
                var nextItem = task.next(data),
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
            throw new TypeError('routine must be a generator');
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
                notify && notify(receipt);
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

    
    function listen(el, type) {
        var handler = function(e) {
            job(wrapGenerator.mark(function() {
                return wrapGenerator(function($ctx) {
                    while (1) switch ($ctx.next) {
                    case 0:
                        $ctx.next = 2;
                        return output.put(e);
                    case 2:
                    case "end":
                        return $ctx.stop();
                    }
                }, this);
            }));
        };

        var output = new EventPipe(el, type, handler);
        return output;
    }

    function jsonp(url) {
        var output = new Pipe();
        $.getJSON(url, function(data) {
            job(wrapGenerator.mark(function() {
                return wrapGenerator(function($ctx) {
                    while (1) switch ($ctx.next) {
                    case 0:
                        $ctx.next = 2;
                        return output.put(data);
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

    function pace(pipe, ms) {
        var output = new Pipe();
        
        job(wrapGenerator.mark(function() {
            var timeoutId, data;

            return wrapGenerator(function($ctx) {
                while (1) switch ($ctx.next) {
                case 0:
                    if (!pipe.isOpen) {
                        $ctx.next = 8;
                        break;
                    }

                    $ctx.next = 3;
                    return pipe.get();
                case 3:
                    data = $ctx.sent;
                    clearTimeout(timeoutId);

                    timeoutId = setTimeout(function() {
                        job(wrapGenerator.mark(function() {
                            return wrapGenerator(function($ctx) {
                                while (1) switch ($ctx.next) {
                                case 0:
                                    $ctx.next = 2;
                                    return output.put(data);
                                case 2:
                                case "end":
                                    return $ctx.stop();
                                }
                            }, this);
                        }));
                    }, ms);

                    $ctx.next = 0;
                    break;
                case 8:
                    output.close();
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

    
    ///
    /// Exports
    ///
    

    global.JSPipe = {
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
