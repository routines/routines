function main(Pipe, job, timeout) {
    var pipe = new Pipe(),
        out = document.getElementById('out');

    function render(q) {
        return q.map(function(p) {
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
        while (yield timeout(250).get()) {
            pipe.send(1);
        }
    });

    // Process 2
    job(function* () {
        while (yield timeout(1000).get()) {
            pipe.send(2);
        }
    });

    
    // Process 3
    job(function* () {
        while (yield timeout(1500).get()) {
            pipe.send(3);
        }
    });


    // Render 10 most recent items from the 3 simultaneous processes
    job(function* () {
        var data = [],
            newItem;

        while (newItem = yield pipe.get()) {
            out.innerHTML = render(data);
            data.push(newItem);
            data = peekn(data, 10);
        }
    });

}


main(JSPipe.Pipe, JSPipe.job, JSPipe.timeout);
