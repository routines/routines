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

        it('sets the "isOpen" flag to false', function() {
            var expected = [true, false],
                actual = [];

            actual.push(p.isOpen);
            p.close();
            actual.push(p.isOpen);
            expect(actual).toEqual(expected);

        });

    });

});

