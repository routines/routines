
wrapGenerator.mark(main);

function main(Pipe, job, timeout, select) {
    var c1, c2, c3, out, start, timetaken, message;

    return wrapGenerator(function main$($ctx) {
        while (1) switch ($ctx.next) {
        case 0:
            message = function message(text) {
                var p = document.createElement('p');
                p.innerHTML = text;
                out.appendChild(p);
            };

            c1 = new Pipe(), c2 = new Pipe(), c3 = new Pipe(), out = document.getElementById('out'), start = Date.now();

            job(wrapGenerator.mark(function() {
                return wrapGenerator(function($ctx) {
                    while (1) switch ($ctx.next) {
                    case 0:
                        $ctx.next = 2;
                        return timeout(1000).get();
                    case 2:
                        c1.send('process 1');
                    case 3:
                    case "end":
                        return $ctx.stop();
                    }
                }, this);
            }));

            job(wrapGenerator.mark(function() {
                return wrapGenerator(function($ctx) {
                    while (1) switch ($ctx.next) {
                    case 0:
                        $ctx.next = 2;
                        return timeout(2000).get();
                    case 2:
                        c2.send('process 2');
                    case 3:
                    case "end":
                        return $ctx.stop();
                    }
                }, this);
            }));

            job(wrapGenerator.mark(function() {
                return wrapGenerator(function($ctx) {
                    while (1) switch ($ctx.next) {
                    case 0:
                        $ctx.next = 2;
                        return timeout(1500).get();
                    case 2:
                        c3.send('process 3');
                    case 3:
                    case "end":
                        return $ctx.stop();
                    }
                }, this);
            }));

            $ctx.next = 7;

            return select([ { pipe: c1, response: message },
                           { pipe: c2, response: message },
                           { pipe: c3, response: message } ]).get()
        case 7:
            timetaken = Date.now() - start;
            message('Time taken: ' + timetaken + 'ms');
            message('Notice that total time taken is under 3s since the processes run in parallel.');
        case 10:
        case "end":
            return $ctx.stop();
        }
    }, this);
}

JSPipe.job(main, [JSPipe.Pipe, JSPipe.job, JSPipe.timeout, JSPipe.select]);




