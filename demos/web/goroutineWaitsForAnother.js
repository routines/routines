
(function(Channel, go, select, timeout, sentinel, lazyseq) {

    go(function* () {

        var sorted = new Channel(),
            log = new Channel(),
            numbers = new Channel(),
            randomNumber = (index) => { return Math.random(); };

        go(printLogMessages);
        go(receiveNumbers, lazyseq(100000, randomNumber));
        go(sortNumbers);
        
        var [ sortedNumbers, sortTime ] = yield sorted.receive();        

        
        yield log.put('sort complete. took ' + sortTime + 'ms for ' + sortedNumbers.length + ' items.');
        yield log.put('first: ' + sortedNumbers[0]);
        yield log.put('last: ' + sortedNumbers[sortedNumbers.length-1]);

        
        ///
        /// Goroutines
        ///


        function* printLogMessages() {
            var text, p,
                logDiv = document.getElementById('log');
            
            while (true) {                
                text = yield log.receive(),
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
                n = yield channel.receive();
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

            nums = yield numbers.receive();
            start = Date.now();
            nums.sort();
            end = Date.now();
            yield sorted.put([nums, end - start]);
        }

    });



})($async.Channel, $async.go, $async.select, $async.timeout, $async.sentinel, $async.lazyseq);
