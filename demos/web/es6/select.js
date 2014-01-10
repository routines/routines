
function* main(Pipe, job, timeout, select) {

    var c1 = new Pipe(),
        c2 = new Pipe(),
        c3 = new Pipe(),
        out = document.getElementById('out'),
        start = Date.now(),
        timetaken;

    job(function* () {
        yield timeout(1000).get();
        c1.send('process 1');
    });

    job(function* () {
        yield timeout(2000).get();
        c2.send('process 2');        
    });

    job(function* () {
        yield timeout(1500).get();
        c3.send('process 3');
    });


    function message(text) {
        var p = document.createElement('p');
        p.innerHTML = text;
        out.appendChild(p);
    }


    yield select([ { pipe: c1, response: message },
                   { pipe: c2, response: message },
                   { pipe: c3, response: message } ]).get();

    timetaken = Date.now() - start;
    message('Time taken: ' + timetaken + 'ms');
    message('Notice that total time taken is under 3s since the processes run in parallel.');

}

JSPipe.job(main, [JSPipe.Pipe, JSPipe.job, JSPipe.timeout, JSPipe.select]);

