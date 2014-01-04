
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

        });

    });

    describe('get', function() {


        describe('return value', function() {

            it('is a function', function() {
                var ret = p.get();
                expect(typeof ret).toEqual('function');
            });

        });

    });

    describe('send', function() {

        it('calls put', function() {
            spyOn(p, 'put').andCallThrough();
            p.send('test');
            expect(p.put).toHaveBeenCalledWith('test');
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

    });
});

