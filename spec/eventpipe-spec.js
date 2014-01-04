
describe('JSPipe.EventPipe', function() {

    var pseudoElement = jasmine.createSpyObj('pseudoElement', ['addEventListener', 'removeEventListener']),
        handler = function() {},
        p = new JSPipe.EventPipe(pseudoElement, 'someEventName', handler);

    describe('constructor', function() {

        it('adds an event listener to the element', function() {            
            expect(pseudoElement.addEventListener).toHaveBeenCalledWith('someEventName', handler);
        });
        
    });

    describe('close', function() {

        it('removes the event listener from the element', function() {
            p.close();
            expect(pseudoElement.removeEventListener).toHaveBeenCalledWith('someEventName', handler);
        });
        
    });

});
