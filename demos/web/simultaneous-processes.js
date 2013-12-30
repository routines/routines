(function(Pipe, job, timeout) {
    var pipe = new Pipe(),
        out = document.getElementById('out');

    function render(q) {
        return q.map((p) => {
            return '<div class="proc-' + p + '">Process ' + p + '</div>';
        }).join('');
    }

    function peekn(array, n) {
        var len = array.length,
            res = len > n ? array.slice(len - n) : array;
        return res;
    }

    // Process 1
    job(function* () {
        while (true) {
            yield timeout(250).get();
            yield pipe.put(1);
        }
    });

    // Process 2
    job(function* () {
        while (true) {
            yield timeout(1000).get();
            yield pipe.put(2);
        }
    });

    
    // Process 3
    job(function* () {
        while (true) {
            yield timeout(1500).get();
            yield pipe.put(3);
        }
    });


    // Render 10 most recent items from the 3 simultaneous processes
    job(function* () {
        var data = [],
            newItem;

        while (true) {
            out.innerHTML = render(data);
            newItem = yield pipe.get();
            data.push(newItem);
            data = peekn(data, 10);
        }
    });

})($async.Pipe, $async.job, $async.timeout);
