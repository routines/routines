function main(Chan, go, timeout) {
    var chan = new Chan(),
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
    go(regeneratorRuntime.mark(function callee$1$0() {
        return regeneratorRuntime.wrap(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
            case 0:
                context$2$0.next = 2;
                return timeout(250).get();
            case 2:
                if (!context$2$0.sent) {
                    context$2$0.next = 6;
                    break;
                }

                chan.send(1);
                context$2$0.next = 0;
                break;
            case 6:
            case "end":
                return context$2$0.stop();
            }
        }, callee$1$0, this);
    }));

    // Process 2
    go(regeneratorRuntime.mark(function callee$1$1() {
        return regeneratorRuntime.wrap(function callee$1$1$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
            case 0:
                context$2$0.next = 2;
                return timeout(1000).get();
            case 2:
                if (!context$2$0.sent) {
                    context$2$0.next = 6;
                    break;
                }

                chan.send(2);
                context$2$0.next = 0;
                break;
            case 6:
            case "end":
                return context$2$0.stop();
            }
        }, callee$1$1, this);
    }));


    // Process 3
    go(regeneratorRuntime.mark(function callee$1$2() {
        return regeneratorRuntime.wrap(function callee$1$2$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
            case 0:
                context$2$0.next = 2;
                return timeout(1500).get();
            case 2:
                if (!context$2$0.sent) {
                    context$2$0.next = 6;
                    break;
                }

                chan.send(3);
                context$2$0.next = 0;
                break;
            case 6:
            case "end":
                return context$2$0.stop();
            }
        }, callee$1$2, this);
    }));


    // Render 10 most recent items from the 3 simultaneous processes
    go(regeneratorRuntime.mark(function callee$1$3() {
        var data, newItem;

        return regeneratorRuntime.wrap(function callee$1$3$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
            case 0:
                data = [];
            case 1:
                context$2$0.next = 3;
                return chan.get();
            case 3:
                if (!(newItem = context$2$0.sent)) {
                    context$2$0.next = 9;
                    break;
                }

                out.innerHTML = render(data);
                data.push(newItem);
                data = peekn(data, 10);
                context$2$0.next = 1;
                break;
            case 9:
            case "end":
                return context$2$0.stop();
            }
        }, callee$1$3, this);
    }));

}


main(Routines.Chan, Routines.go, Routines.timeout);
