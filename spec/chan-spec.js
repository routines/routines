/*globals describe, beforeEach, it, expect, spyOn, Routines */


describe('Routines.Chan', function() {
    var p;

    beforeEach(function() {
        debugger;
        p = new Routines.Chan();
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
        var chan,
            data = ['alpha', 'beta', 'gamma'],
            expected,
            actual;

        beforeEach(function() {
            chan = new Routines.Chan();
            actual = [];
            expected = undefined;
        });

        it('puts the contents of "array" into the channel and closes the channel', function(done) {
            expected = data.map(function(v) {
                return {data: v};
            });

            expected.push({close: 'pushItems'});

            chan.pushItems(data);

            Routines.go(function* () {
                var d;
                while ((d = yield chan.get())) {
                    actual.push(d);
                }
            });

            setTimeout(function() {
              if (actual.length === expected.length) {
                expect(actual).toEqual(expected);
                done();
              }

            }, 33);

        });

        it('leaves the channel open if the optional "leaveOpen" argument is "true"', function(done) {
            expected = data.map(function(v) { return { data: v }; });

            chan.pushItems(data, true);

            Routines.go(function* () {
                var d;
                while ((d = yield chan.get())) {
                    actual.push(d);
                }
            });

            setTimeout(function() {
              if (actual.length === expected.length) {
                expect(actual).toEqual(expected);
                done();
              }
            }, 33);
        });


        it('returns a channel which closes after the items are copied', function(done) {
            var resultChan = chan.pushItems(data);
            expected = ['closed', false];

            Routines.go(function* () {
                var v;
                if ((yield resultChan.get()).close) {
                    actual.push('closed');
                    actual.push(resultChan.isOpen);
                }
            });

            setTimeout(function() {
              if (actual.length === expected.length) {
                expect(actual).toEqual(expected);
                done();
              }

            }, 33);

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

        it('puts a "{close:context}" message into the channel', function(done) {
            expected = [{close:'testing'}];
            p.send('some data');
            p.close('testing');

            Routines.go(function* () {
                var msg;
                while (!(msg = yield p.get()).close) {}
                actual.push(msg);
            });

            setTimeout(function() {
              if (actual.length === expected.length) {
                expect(actual).toEqual(expected);
                done();
              }

            }, 33);
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

        it('freezes the channel', function() {
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
