function main(go, Chan, listen) {
    var ball = document.getElementById('ball'),
        ballWidth = ball.clientWidth,
        ballHeight = ball.clientHeight,
        pointerIsDown = false,
        touchmoveChan = listen(document, 'touchmove', true),
        pointermoveChan = new Chan(),
        throwChan = new Chan(),
        timeSpaceSamples = [],
        sampleSize = 4,
        throwDistance = 100,
        pointerPositionInBall,
        currentPosition;


    function* draggingBall() {
        var evt, x, y;
        while (evt = yield pointermoveChan.get()) {

            x = evt.clientX - pointerPositionInBall.x;
            y = evt.clientY - pointerPositionInBall.y;

            timeSpaceSamples.push({ time: Date.now(),
                                    x: x,
                                    y: y });

            while (timeSpaceSamples.length > sampleSize) {
                timeSpaceSamples.shift();
            }

            placeBall(x, y);
        }
    }

    function* throwingBall() {
        var velocity,
            x, y;

        while (velocity = yield throwChan.get()) {
            x = currentPosition.x + velocity.x * throwDistance;
            y = currentPosition.y + velocity.y * throwDistance;


            placeBall(x, y, 900, 'cubic-bezier(0.19, 1, 0.22, 1)');
        }
    }

    function* bouncingBall() {

    }


    function placeBall(x, y, duration, ease) {
        var maxX = document.width - ballWidth,
            maxY = document.height - ballHeight,
            willHitWall = false;

        x = Math.round(x);
        y = Math.round(y);

        if (!willHitWall) {

            ball.style.webkitTransitionDuration = duration || 16;
            ball.style.webkitTransitionTimingFunction = ease || 'ease-out';

            ball.style.webkitTransform =
                'translateX(' + (x) +
                'px) translateY(' + (y) + 'px)';

            currentPosition = { x: x, y: y };
        }

    }




    function* startingTouchOnBall() {
        var touchstart = listen(ball, 'touchstart'),
            touch,
            evt,
            currentX, currentY;

        while (evt = yield touchstart.get()) {
            touch = evt.targetTouches[0];
            console.log(touch);

                pointerIsDown = true;

                currentX = (currentPosition && currentPosition.x) || 0;
                currentY = (currentPosition && currentPosition.y) || 0;
                pointerPositionInBall = { x: touch.clientX - currentX,
                                          y: touch.clientY - currentY };

        }
    }

    function* touchmoving() {
        var evt, touch;
        while (evt = yield touchmoveChan.get()) {
            touch = evt.touches[0];
            if (touch.target === ball) {
                pointermoveChan.send(touch);
            }
        }
    }


    function* endingTouch() {
        var touchend = listen(document, 'touchend'),
            velocity, oldestSample, newestSample, duration,
            xDirection, yDirection,
            evt;

        while (evt = yield touchend.get()) {
            if (pointerIsDown) {
                pointerIsDown = false;

                oldestSample = timeSpaceSamples[0];
                newestSample = timeSpaceSamples[timeSpaceSamples.length - 1];
                duration = newestSample.time - oldestSample.time;
                xDirection = (newestSample.x - oldestSample.x) < 0 ? -1 : 1;
                yDirection = (newestSample.y - oldestSample.y) < 0 ? -1 : 1;

                velocity = {
                    x: (newestSample.x - oldestSample.x) / (duration/2),
                    y: (newestSample.y - oldestSample.y) / (duration/2),
                    xDirection: xDirection,
                    yDirection: yDirection
                };

                throwChan.send(velocity);
            }
        }
    }

    go(draggingBall);
    go(throwingBall);
    go(bouncingBall);

    go(touchmoving);
    go(startingTouchOnBall);
    go(endingTouch);

}


main(Routines.go, Routines.Chan, Routines.listen);
