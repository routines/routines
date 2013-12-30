(function(Pipe, job, timeout, select) {

    var c1 = new Pipe(),
        c2 = new Pipe(),
        c3 = new Pipe(),
        out = document.getElementById('out'),
        start = Date.now(),
        timetaken;

    job(function* () {
        yield timeout(1000).get();
        yield c1.put('process 1');
    });

    job(function* () {
        yield timeout(2000).get();
        yield c2.put('process 2');        
    });

    job(function* () {
        yield timeout(1500).get();
        yield c3.put('process 3');
    });


    function message(text) {
        var p = document.createElement('p');
        p.innerHTML = text;
        out.appendChild(p);
    }

    await select([ { channel: c1, response: message },
                   { channel: c2, response: message },
                   { channel: c3, response: message } ]);

    timetaken = Date.now() - start;
    message('Time taken: ' + timetaken + 'ms');
    message('Notice that total time taken is under 3s since the processes run in parallel.');


})($async.Pipe, $async.job, $async.timeout, $async.select);
