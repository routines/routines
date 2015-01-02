function main(Chan, go, timeout, lazyseq, sentinel) {

    go(function* () {

        var sorted = new Chan(),
            log = new Chan(),
            numbers = new Chan(),
            randomNumber = function(index) { return Math.random(); },
            sortResult,
            sortedNumbers,
            sortTime;

        go(printLogMessages);
        go(receiveNumbers, [lazyseq(100000, randomNumber)]);
        go(sortNumbers);

        sortResult = yield sorted.get();
        sortedNumbers = sortResult.numbers;
        sortTime = sortResult.time;

        log.send('sort complete. took ' + sortTime + 'ms for ' + sortedNumbers.length + ' items.');
        log.send('first: ' + sortedNumbers[0]);
        log.send('last: ' + sortedNumbers[sortedNumbers.length-1]);


        ///
        /// Routines
        ///


        function* printLogMessages() {
            var text, p,
                logDiv = document.getElementById('log');

            while (text = yield log.get()) {
                p = document.createElement('p');
                p.innerHTML = text;
                logDiv.appendChild(p);
            }
        }

        function* receiveNumbers(chan) {
            var all = false,
                nums = [],
                start = Date.now(),
                n;

            // TODO: this while loop is the logic
            // for Range syntax; implement it using sweetjs
            // and make part of core Routines.
            while (!all) {
                n = yield chan.get();
                if (n === sentinel) {
                    all = true;
                } else {
                    nums.push(n);
                }
            }

            log.send('took ' + (Date.now() - start) + 'ms to receive ' + nums.length + ' random numbers');

            yield numbers.put(nums);
        }

        function* sortNumbers() {
            var nums,
                start,
                end;

            nums = yield numbers.get();
            start = Date.now();
            nums.sort();
            end = Date.now();
            sorted.send({ numbers: nums,
                          time: end - start });
        }

    });

};

main(Routines.Chan, Routines.go, Routines.timeout, Routines.lazyseq, Routines.sentinel);
