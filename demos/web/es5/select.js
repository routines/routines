
var main = regeneratorRuntime.mark(function main(Chan, go, timeout, select) {
    var c1, c2, c3, out, start, timetaken, message;

    return regeneratorRuntime.wrap(function main$(context$1$0) {
        while (1) switch (context$1$0.prev = context$1$0.next) {
        case 0:
            message = function message(text) {
                var p = document.createElement('p');
                p.innerHTML = text;
                out.appendChild(p);
            };

            c1 = new Chan(), c2 = new Chan(), c3 = new Chan(), out = document.getElementById('out'), start = Date.now();

            go(regeneratorRuntime.mark(function callee$1$0() {
                return regeneratorRuntime.wrap(function callee$1$0$(context$2$0) {
                    while (1) switch (context$2$0.prev = context$2$0.next) {
                    case 0:
                        context$2$0.next = 2;
                        return timeout(1000).get();
                    case 2:
                        c1.send('process 1');
                    case 3:
                    case "end":
                        return context$2$0.stop();
                    }
                }, callee$1$0, this);
            }));

            go(regeneratorRuntime.mark(function callee$1$1() {
                return regeneratorRuntime.wrap(function callee$1$1$(context$2$0) {
                    while (1) switch (context$2$0.prev = context$2$0.next) {
                    case 0:
                        context$2$0.next = 2;
                        return timeout(2000).get();
                    case 2:
                        c2.send('process 2');
                    case 3:
                    case "end":
                        return context$2$0.stop();
                    }
                }, callee$1$1, this);
            }));

            go(regeneratorRuntime.mark(function callee$1$2() {
                return regeneratorRuntime.wrap(function callee$1$2$(context$2$0) {
                    while (1) switch (context$2$0.prev = context$2$0.next) {
                    case 0:
                        context$2$0.next = 2;
                        return timeout(1500).get();
                    case 2:
                        c3.send('process 3');
                    case 3:
                    case "end":
                        return context$2$0.stop();
                    }
                }, callee$1$2, this);
            }));


            context$1$0.next = 7;

            return select([ { chan: c1, response: message },
                           { chan: c2, response: message },
                           { chan: c3, response: message } ]).get();
        case 7:
            timetaken = Date.now() - start;
            message('Time taken: ' + timetaken + 'ms');
            message('Notice that total time taken is under 3s since the processes run in parallel.');
        case 10:
        case "end":
            return context$1$0.stop();
        }
    }, main, this);
});

Routines.go(main, [Routines.Chan, Routines.go, Routines.timeout, Routines.select]);
