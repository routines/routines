/*globals describe, it, expect, waitsFor, runs, jasmine, beforeEach, afterEach, JSPipe */

describe('timeout', function() {

    it('returns a new Pipe', function() {
        var ret = JSPipe.timeout();
        expect(ret instanceof JSPipe.Pipe).toEqual(true);
    });

    it('waits the specified miliseconds and then puts that value into the returned Pipe', function() {
        var expected = 10,
            pipe = JSPipe.timeout(expected),
            actual;

        JSPipe.job(function* () {
            actual = yield pipe.get();
        });

        waitsFor(function() {
            return actual !== undefined;
        });

        runs(function() {
            expect(actual).toEqual(expected);
        });
    });

    it('closes the Pipe after the time has elapsed', function() {
        var pipe = JSPipe.timeout(100),
            expected = [true, false],
            actual = [];

        actual.push(pipe.isOpen);

        waitsFor(function() {
            return pipe.isOpen === false;
        });

        runs(function() {
            actual.push(pipe.isOpen);
            expect(actual).toEqual(expected);
        });
    });
    
});


describe('listen', function() {

    var pipe, event;

    beforeEach(function() {
        pipe = JSPipe.listen(document, 'click');
        event = document.createEvent('MouseEvents');
        event.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);       
    });

    afterEach(function() {
        pipe.close();
    });

    it('returns a new EventPipe', function() {
        expect(pipe instanceof JSPipe.EventPipe).toEqual(true);        
    });

    it('sends the event data to the EventPipe when the event occurs', function() {
        var expected = document,
            actual = [];

        event.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);        
        document.dispatchEvent(event);

        JSPipe.job(function* () {
            actual.push(yield pipe.get());
        });

        waitsFor(function() {
            return actual.length > 0;
        });

        runs(function() {
            expect(actual[0].srcElement).toEqual(expected);
        });

    });

    it('can call preventDefault when the event is handled', function() {
        var eventDataFromPipe;

        pipe = JSPipe.listen(document, 'click', true);
        
        JSPipe.job(function* () {
            eventDataFromPipe = yield pipe.get();
        });
        
        document.dispatchEvent(event);        

        waitsFor(function() {
            return eventDataFromPipe !== undefined;
        });

        runs(function() {
            expect(eventDataFromPipe.defaultPrevented).toEqual(true);
        });
    });
    
});



describe('lazyseq', function() {


});


