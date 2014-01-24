/*globals describe, beforeEach, it, expect, spyOn, JSPipe */


describe('JSPipe.Pipe', function() {
    var p;

    beforeEach(function() {
        debugger;
        p = new JSPipe.Pipe();
    });

    describe('put', function() {

        describe('return value', function() {

            it('is a function', function() {
                var ret = p.put();
                expect(typeof ret).toEqual('function');
            });

            describe('invocation', function() {

                it('pushes data argument and resume argument into the inbox', function() {
                    var ret = p.put('data');
                    ret('resume');
                    expect(p.inbox).toEqual(['data', 'resume']);                    
                });
                
            });

        });

    });

    describe('pushItems', function() {
        var pipe,
            data = ['alpha', 'beta', 'gamma'],
            expected,
            actual;            

        beforeEach(function() {
            pipe = new JSPipe.Pipe();
            actual = [];
            expected = undefined;
        });
        
        it('puts the contents of "array" into the pipe and closes the pipe', function() {
            expected = data.map(function(v) {
                return {data: v};
            });

            expected.push({close: 'pushItems'});
            
            pipe.pushItems(data);

            JSPipe.job(function* () {
                var d;
                while ((d = yield pipe.get())) {
                    actual.push(d);
                }
            });

            waitsFor(function() {
                return actual.length === expected.length;
            });

            runs(function() {
                expect(actual).toEqual(expected);
            });

        });

        it('leaves the pipe open if the optional "leaveOpen" argument is "true"', function() {
            expected = data.map(function(v) { return { data: v }; });

            pipe.pushItems(data, true);

            JSPipe.job(function* () {
                var d;
                while ((d = yield pipe.get())) {
                    actual.push(d);
                }
            });

            waitsFor(function() {
                return actual.length === expected.length;
            });

            runs(function() {
                expect(actual).toEqual(expected);                
            });
        });

        
        it('returns a pipe which closes after the items are copied', function() {
            var resultPipe = pipe.pushItems(data);
            expected = ['closed', false];

            JSPipe.job(function* () {
                var v;
                if ((yield resultPipe.get()).close) {
                    actual.push('closed');
                    actual.push(resultPipe.isOpen);
                }
            });

            waitsFor(function() {
                return actual.length === expected.length;
            });

            runs(function() {
                expect(actual).toEqual(expected);
            });            
            
        });

    });

    describe('get', function() {


        describe('return value', function() {

            it('is a function', function() {
                var ret = p.get();
                expect(typeof ret).toEqual('function');
            });

            describe('invocation', function() {

                it('pushes resume argument into the outbox', function() {
                    var ret = p.get();
                    ret('getResume');
                    expect(p.outbox).toEqual(['getResume']);
                });

            });

        });

    });

    describe('send', function() {

        it('pushes the data into the inbox and an undefined resume', function() {
            var expected = ['test', undefined];
            p.send('test');
            expect(p.inbox).toEqual(expected);
        });

    });

    describe('close', function() {
        var expected,
            actual;

        beforeEach(function() {
            actual = [];
        });

        it('puts a "{close:context}" message into the pipe', function() {
            expected = [{close:'testing'}];
            p.send('some data');
            p.close('testing');

            JSPipe.job(function* () {
                var msg;
                while (!(msg = yield p.get()).close) {}
                actual.push(msg);
            });

            waitsFor(function() { return actual.length === expected.length; });

            runs(function() { expect(actual).toEqual(expected); });                
            
        });

        it('sets the "isOpen" flag to false', function() {
            var expected = [true, false];

            actual.push(p.isOpen);
            p.close();
            actual.push(p.isOpen);
            expect(actual).toEqual(expected);
        });


        it('changes "put" to throw an exception in the future', function() {
            p.close();
            expect(p.put).toThrow();
        });

        it('changes "pushItems" to throw an exception in the future', function() {
            p.close();
            expect(p.pushItems).toThrow();
        });

        it('changes "send" to throw an exception in the future', function() {
            p.close();
            expect(p.send).toThrow();
        });

        it('freezes the pipe', function() {
            expected = [true, false, false];
            actual.push(p.isOpen);
            p.close();
            actual.push(p.isOpen);
            p.isOpen = true;
            actual.push(p.isOpen);
            
            expect(actual).toEqual(expected);
        });

    });

});
