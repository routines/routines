/*globals describe, it, expect, JSPipe */

describe('job', function() {

    describe('fn argument', function() {

        it('it is a generator function that is executed when "job" is invoked', function() {
            var expected = 'didRun',
                actual;
            
            JSPipe.job(function* () {
                actual = expected;
            });

            expect(actual).toEqual(expected);

        });

        it('can yield functions that are invoked by "job"', function() {
            var expected = 15,
                actual;

            JSPipe.job(function* () {
                yield function() { actual = expected; };
            });

            expect(actual).toEqual(expected);                 
        });

        describe('yielded function', function() {

            it('is passed a function that, when called, invokes the next iteration of the generator function', function() {
                var expected = [1, 2],
                    actual = [];

                JSPipe.job(function* () {
                    yield function(resume) {
                        actual.push(1);
                        resume();
                    };
                    actual.push(2);                    
                });

                expect(actual).toEqual(expected);

            });
            
        });

    });    

});
