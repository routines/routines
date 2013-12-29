(function() {
    var Channel = $async.Channel,
        go = $async.go,
        timeout = $async.timeout,
        channel = new Channel(),
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
    go(function* () {
        while (true) {
            yield timeout(250).get();
            yield channel.put(1);
        }
    });

    // Process 2
    go(function* () {
        while (true) {
            yield timeout(1000).get();
            yield channel.put(2);
        }
    });

    
    // Process 3
    go(function* () {
        while (true) {
            yield timeout(1500).get();
            yield channel.put(3);
        }
    });


    // Render 10 most recent items from the 3 simultaneous processes
    go(function* () {
        var data = [],
            newItem;

        while (true) {
            out.innerHTML = render(data);
            newItem = yield channel.get();
            data.push(newItem);
            data = peekn(data, 10);
        }
    });

})();