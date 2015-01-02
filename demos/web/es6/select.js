
function* main(Chan, go, timeout, select) {

    var c1 = new Chan(),
        c2 = new Chan(),
        c3 = new Chan(),
        out = document.getElementById('out'),
        start = Date.now(),
        timetaken;

    go(function* () {
        yield timeout(1000).get();
        c1.send('process 1');
    });

    go(function* () {
        yield timeout(2000).get();
        c2.send('process 2');
    });

    go(function* () {
        yield timeout(1500).get();
        c3.send('process 3');
    });


    function message(text) {
        var p = document.createElement('p');
        p.innerHTML = text;
        out.appendChild(p);
    }


    yield select([ { chan: c1, response: message },
                   { chan: c2, response: message },
                   { chan: c3, response: message } ]).get();

    timetaken = Date.now() - start;
    message('Time taken: ' + timetaken + 'ms');
    message('Notice that total time taken is under 3s since the processes run in parallel.');

}

Routines.go(main, [Routines.Chan, Routines.go, Routines.timeout, Routines.select]);
