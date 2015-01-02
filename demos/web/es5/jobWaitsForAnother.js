function main(Chan, go, timeout, lazyseq, sentinel) {

    go(regeneratorRuntime.mark(function callee$1$0() {
        var printLogMessages, receiveNumbers, sortNumbers, sorted, log, numbers, randomNumber, sortResult, sortedNumbers, sortTime;

        return regeneratorRuntime.wrap(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
            case 0:
                printLogMessages = regeneratorRuntime.mark(///
                /// Routines
                ///


                function printLogMessages() {
                    var text, p, logDiv;

                    return regeneratorRuntime.wrap(function printLogMessages$(context$3$0) {
                        while (1) switch (context$3$0.prev = context$3$0.next) {
                        case 0:
                            logDiv = document.getElementById('log');
                        case 1:
                            context$3$0.next = 3;
                            return log.get();
                        case 3:
                            if (!(text = context$3$0.sent)) {
                                context$3$0.next = 9;
                                break;
                            }

                            p = document.createElement('p');
                            p.innerHTML = text;
                            logDiv.appendChild(p);
                            context$3$0.next = 1;
                            break;
                        case 9:
                        case "end":
                            return context$3$0.stop();
                        }
                    }, printLogMessages, this);
                });

                receiveNumbers = regeneratorRuntime.mark(function receiveNumbers(chan) {
                    var all, nums, start, n;

                    return regeneratorRuntime.wrap(function receiveNumbers$(context$3$0) {
                        while (1) switch (context$3$0.prev = context$3$0.next) {
                        case 0:
                            all = false, nums = [], start = Date.now();
                        case 1:
                            if (all) {
                                context$3$0.next = 8;
                                break;
                            }

                            context$3$0.next = 4;
                            return chan.get();
                        case 4:
                            n = context$3$0.sent;
                            if (n === sentinel) {
                                all = true;
                            } else {
                                nums.push(n);
                            }
                            context$3$0.next = 1;
                            break;
                        case 8:
                            log.send('took ' + (Date.now() - start) + 'ms to receive ' + nums.length + ' random numbers');

                            context$3$0.next = 11;
                            return numbers.put(nums);
                        case 11:
                        case "end":
                            return context$3$0.stop();
                        }
                    }, receiveNumbers, this);
                });

                sortNumbers = regeneratorRuntime.mark(function sortNumbers() {
                    var nums, start, end;

                    return regeneratorRuntime.wrap(function sortNumbers$(context$3$0) {
                        while (1) switch (context$3$0.prev = context$3$0.next) {
                        case 0:
                            context$3$0.next = 2;
                            return numbers.get();
                        case 2:
                            nums = context$3$0.sent;
                            start = Date.now();
                            nums.sort();
                            end = Date.now();
                            sorted.send({ numbers: nums,
                                          time: end - start });
                        case 7:
                        case "end":
                            return context$3$0.stop();
                        }
                    }, sortNumbers, this);
                });

                sorted = new Chan(), log = new Chan(), numbers = new Chan(), randomNumber = function(index) { return Math.random(); };

                go(printLogMessages);
                go(receiveNumbers, [lazyseq(100000, randomNumber)]);
                go(sortNumbers);

                context$2$0.next = 9;
                return sorted.get();
            case 9:
                sortResult = context$2$0.sent;
                sortedNumbers = sortResult.numbers;
                sortTime = sortResult.time;

                log.send('sort complete. took ' + sortTime + 'ms for ' + sortedNumbers.length + ' items.');
                log.send('first: ' + sortedNumbers[0]);
                log.send('last: ' + sortedNumbers[sortedNumbers.length-1]);
            case 15:
            case "end":
                return context$2$0.stop();
            }
        }, callee$1$0, this);
    }));

};

main(Routines.Chan, Routines.go, Routines.timeout, Routines.lazyseq, Routines.sentinel);
