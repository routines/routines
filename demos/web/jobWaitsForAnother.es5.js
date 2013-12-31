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
                            $ctx.next = 8;

                            return sorted.put({numbers:nums,
                                              time:end - start})
                        case 8:
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
                            $ctx.next = 10;
                            return log.put('took ' + (Date.now() - start) + 'ms to receive ' + nums.length + ' random numbers');
                        case 10:
                            $ctx.next = 12;
                            return numbers.put(nums);
                        case 12:
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
                            if (!true) {
                                $ctx.next = 10;
                                break;
                            }

                            $ctx.next = 4;
                            return log.get();
                        case 4:
                            text = $ctx.sent;
                            p = document.createElement('p');
                            p.innerHTML = text;
                            logDiv.appendChild(p);
                            $ctx.next = 1;
                            break;
                        case 10:
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
                $ctx.next = 14;
                return log.put('sort complete. took ' + sortTime + 'ms for ' + sortedNumbers.length + ' items.');
            case 14:
                $ctx.next = 16;
                return log.put('first: ' + sortedNumbers[0]);
            case 16:
                $ctx.next = 18;
                return log.put('last: ' + sortedNumbers[sortedNumbers.length-1]);
            case 18:
            case "end":
                return $ctx.stop();
            }
        }, this);
    }));

};

main(JSPipe.Pipe, JSPipe.job, JSPipe.timeout, JSPipe.lazyseq, JSPipe.sentinel);



