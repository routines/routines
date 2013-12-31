function main(Pipe, job, listen, unique, pace, jsonp) {

    var input = document.getElementById('searchtext'),
        results = document.getElementById('results');

    function clearResults() {
        results.innerHTML = '';
    }

    function showResults(terms) {
        var i, len, p;

        clearResults();
        
        for (i = 0, len = terms.length; i < len; i++) {
            p = document.createElement('p');
            p.innerHTML = terms[i];
            results.appendChild(p);
        }                
    }

    function searchWikipedia(term) {
        var url = 'http://en.wikipedia.org/w/api.php?action=opensearch&format=json&callback=?&search=' +
                encodeURIComponent(term);
        return jsonp(url);
    }


    function showError(err) {
        results.innerHTML = '<h1p>Error:</h1>' + err;
    }

    job(function* () {
        var keyup = listen(input, 'keyup'),
            pacedKeyup = pace(keyup, 300),
            evt, data, res, text, previousText,
            minLength;
        
        while (true) {
            evt = yield pacedKeyup.get();
            text = evt.target.value;
            minLength = text.length > 2;

            if (minLength && text !== previousText) {                
                data = yield searchWikipedia(text).get();
                
                if (data.error) {
                    showError(JSON.stringify(data.error));
                } else {                    
                    if (data[0] && data[1]) {
                        showResults(data[1]);
                    }
                }
                
            } else if (!minLength) {
                clearResults();
            }

            previousText = text;
        }
    });
};


main(JSPipe.Pipe, JSPipe.job, JSPipe.listen, JSPipe.unique, JSPipe.pace, JSPipe.jsonp);
