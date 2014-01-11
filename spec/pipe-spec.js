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
                
                it('calls _rendezvous()', function() {
                    var ret = p.put();
                    spyOn(p, '_rendezvous').andCallThrough();
                    ret();
                    expect(p._rendezvous).toHaveBeenCalled();
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

                it('calls _rendezvous()', function() {
                    var ret = p.get();
                    spyOn(p, '_rendezvous').andCallThrough();
                    ret();
                    expect(p._rendezvous).toHaveBeenCalled();
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

        it('calls _rendezvous()', function() {
            spyOn(p, '_rendezvous').andCallThrough();
            p.send('some data');
            expect(p._rendezvous).toHaveBeenCalled();
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

    describe('_rendezvous', function() {
        var data = 'some data',
            senderExpected,
            receiverExpected,
            senderActual,
            receiverActual;                    

        function notify() {
            senderActual.push('didSend');
        }

        function send(data) {
            receiverActual.push(data);
        }

        beforeEach(function() {
            senderExpected = ['didSend'];
            receiverExpected = [data];
            senderActual = [];
            receiverActual = [];
            
            p.inbox = [data, notify];
            p.outbox = [send];
        });

        it('sends data placed in the inbox to the function in the outbox', function() {
            p._rendezvous();
            expect(receiverActual).toEqual(receiverExpected);
        });

        it('notifies the sender that the data was delivered', function() {
            p._rendezvous();
            expect(senderActual).toEqual(senderExpected);
        });

    });
});

