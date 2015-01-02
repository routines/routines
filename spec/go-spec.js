/*globals describe, it, expect, Routines */

describe('go', function() {

    describe('fn argument', function() {

        it('it is a generator function that is executed when "go" is invoked', function() {
            var expected = 'didRun',
                actual;

            Routines.go(function* () {
                actual = expected;
            });

            expect(actual).toEqual(expected);

        });

        it('can yield functions that are invoked by "go"', function() {
            var expected = 15,
                actual;

            Routines.go(function* () {
                yield function() { actual = expected; };
            });

            expect(actual).toEqual(expected);
        });

        describe('yielded function', function() {

            it('is passed a function that, when called, invokes the next iteration of the generator function', function() {
                var expected = [1, 2],
                    actual = [];

                Routines.go(function* () {
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
