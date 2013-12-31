function main(Pipe, job, timeout, lazyseq, sentinel) {

    job(function* () {

        var sorted = new Pipe(),
            log = new Pipe(),
            numbers = new Pipe(),
            randomNumber = function(index) { return Math.random(); },
            sortResult,
            sortedNumbers,
            sortTime;

        job(printLogMessages);
        job(receiveNumbers, [lazyseq(100000, randomNumber)]);
        job(sortNumbers);

        sortResult = yield sorted.get();
        sortedNumbers = sortResult.numbers;
        sortTime = sortResult.time;

        yield log.put('sort complete. took ' + sortTime + 'ms for ' + sortedNumbers.length + ' items.');
        yield log.put('first: ' + sortedNumbers[0]);
        yield log.put('last: ' + sortedNumbers[sortedNumbers.length-1]);

        
        ///
        /// Jobs
        ///


        function* printLogMessages() {
            var text, p,
                logDiv = document.getElementById('log');
            
            while (true) {                
                text = yield log.get(),
                p = document.createElement('p');
                p.innerHTML = text;
                logDiv.appendChild(p);            
            }
        }

        function* receiveNumbers(pipe) {
            var all = false,
                nums = [],
                start = Date.now(),
                n;

            // TODO: this while loop is the logic
            // for Range syntax; implement it using sweetjs
            // and make part of core JS/Pipe.
            while (!all) {
                n = yield pipe.get();
                if (n === sentinel) {
                    all = true;
                } else {
                    nums.push(n);
                }
            }

            yield log.put('took ' + (Date.now() - start) + 'ms to receive ' + nums.length + ' random numbers');
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
            yield sorted.put({numbers:nums,
                              time:end - start});
        }

    });

};

main(JSPipe.Pipe, JSPipe.job, JSPipe.timeout, JSPipe.lazyseq, JSPipe.sentinel);



