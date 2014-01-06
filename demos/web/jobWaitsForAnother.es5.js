function main(Pipe, job, timeout, lazyseq, sentinel) {

    job(wrapGenerator.mark(function() {
        var sorted, log, numbers, randomNumber, sortResult, sortedNumbers, sortTime, printLogMessages, receiveNumbers, sortNumbers;

        return wrapGenerator(function($ctx) {
            while (1) switch ($ctx.next) {
            case 0:
                sortNumbers = wrapGenerator.mark(function sortNumbers() {
                    var nums, start, end;

                    return wrapGenerator(function sortNumbers$($ctx) {
                        while (1) switch ($ctx.next) {
                        case 0:
                            $ctx.next = 2;
                            return numbers.get();
                        case 2:
                            nums = $ctx.sent;
                            start = Date.now();
                            nums.sort();
                            end = Date.now();

                            sorted.send({ numbers: nums,
                                          time: end - start });
                        case 7:
                        case "end":
                            return $ctx.stop();
                        }
                    }, this);
                });

                receiveNumbers = wrapGenerator.mark(function receiveNumbers(pipe) {
                    var all, nums, start, n;

                    return wrapGenerator(function receiveNumbers$($ctx) {
                        while (1) switch ($ctx.next) {
                        case 0:
                            all = false, nums = [], start = Date.now();
                        case 1:
                            if (!!all) {
                                $ctx.next = 8;
                                break;
                            }

                            $ctx.next = 4;
                            return pipe.get();
                        case 4:
                            n = $ctx.sent;

                            if (n === sentinel) {
                                all = true;
                            } else {
                                nums.push(n);
                            }

                            $ctx.next = 1;
                            break;
                        case 8:
                            log.send('took ' + (Date.now() - start) + 'ms to receive ' + nums.length + ' random numbers');
                            $ctx.next = 11;
                            return numbers.put(nums);
                        case 11:
                        case "end":
                            return $ctx.stop();
                        }
                    }, this);
                });

                printLogMessages = wrapGenerator.mark(function printLogMessages() {
                    var text, p, logDiv;

                    return wrapGenerator(function printLogMessages$($ctx) {
                        while (1) switch ($ctx.next) {
                        case 0:
                            logDiv = document.getElementById('log');
                        case 1:
                            $ctx.next = 3;
                            return log.get();
                        case 3:
                            if (!(text = $ctx.sent)) {
                                $ctx.next = 9;
                                break;
                            }

                            p = document.createElement('p');
                            p.innerHTML = text;
                            logDiv.appendChild(p);
                            $ctx.next = 1;
                            break;
                        case 9:
                        case "end":
                            return $ctx.stop();
                        }
                    }, this);
                });

                sorted = new Pipe(), log = new Pipe(), numbers = new Pipe(), randomNumber = function(index) { return Math.random(); };
                job(printLogMessages);
                job(receiveNumbers, [lazyseq(100000, randomNumber)]);
                job(sortNumbers);
                $ctx.next = 9;
                return sorted.get();
            case 9:
                sortResult = $ctx.sent;
                sortedNumbers = sortResult.numbers;
                sortTime = sortResult.time;
                log.send('sort complete. took ' + sortTime + 'ms for ' + sortedNumbers.length + ' items.');
                log.send('first: ' + sortedNumbers[0]);
                log.send('last: ' + sortedNumbers[sortedNumbers.length-1]);
            case 15:
            case "end":
                return $ctx.stop();
            }
        }, this);
    }));

};

main(JSPipe.Pipe, JSPipe.job, JSPipe.timeout, JSPipe.lazyseq, JSPipe.sentinel);



