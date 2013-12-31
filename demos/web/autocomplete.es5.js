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

    job(wrapGenerator.mark(function() {
        var keyup, pacedKeyup, evt, data, res, text, previousText, minLength;

        return wrapGenerator(function($ctx) {
            while (1) switch ($ctx.next) {
            case 0:
                keyup = listen(input, 'keyup'), pacedKeyup = pace(keyup, 300);
            case 1:
                if (!true) {
                    $ctx.next = 18;
                    break;
                }

                $ctx.next = 4;
                return pacedKeyup.get();
            case 4:
                evt = $ctx.sent;
                text = evt.target.value;
                minLength = text.length > 2;

                if (!(minLength && text !== previousText)) {
                    $ctx.next = 14;
                    break;
                }

                $ctx.next = 10;
                return searchWikipedia(text).get();
            case 10:
                data = $ctx.sent;

                if (data.error) {
                    showError(JSON.stringify(data.error));
                } else {                    
                    if (data[0] && data[1]) {
                        showResults(data[1]);
                    }
                }

                $ctx.next = 15;
                break;
            case 14:
                if (!minLength) {
                    clearResults();
                }
            case 15:
                previousText = text;
                $ctx.next = 1;
                break;
            case 18:
            case "end":
                return $ctx.stop();
            }
        }, this);
    }));
};


main(JSPipe.Pipe, JSPipe.job, JSPipe.listen, JSPipe.unique, JSPipe.pace, JSPipe.jsonp);
