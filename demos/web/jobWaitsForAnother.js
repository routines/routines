
(function(Pipe, job, select, timeout, sentinel, lazyseq) {

    job(function* () {

        var sorted = new Pipe(),
            log = new Pipe(),
            numbers = new Pipe(),
            randomNumber = (index) => { return Math.random(); };

        job(printLogMessages);
        job(receiveNumbers, lazyseq(100000, randomNumber));
        job(sortNumbers);
        
        var [ sortedNumbers, sortTime ] = yield sorted.get();        

        
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

        function* receiveNumbers(channel) {
            var all = false,
                nums = [],
                start = Date.now(),
                n;

            // TODO: this while loop is the logic
            // for Range syntax; implement it using sweetjs
            // and make part of core Async-es library.
            while (!all) {
                n = yield channel.get();
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
            yield sorted.put([nums, end - start]);
        }

    });



})($async.Pipe, $async.job, $async.select, $async.timeout, $async.sentinel, $async.lazyseq);
