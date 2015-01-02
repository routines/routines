function main(Chan, go, listen,  pace) {

    var input = document.getElementById('searchtext'),
        results = document.getElementById('results'),
        wikipediaUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&format=json&callback=?&search=',
        searchRequestChan = new Chan(),
        searchResultsChan = new Chan();

    go(search, [searchRequestChan, searchResultsChan]);
    go(displaySearchResults, [searchResultsChan]);
    go(getUserSearchInput, [searchRequestChan]);


    function* search(requestChan, resultChan) {
        var searchTerm,
            httpRequest;

        while (searchTerm = yield requestChan.get()) {
            httpRequest && httpRequest.abort();
            httpRequest = $.getJSON(wikipediaUrl + encodeURIComponent(searchTerm),
                                    resultChan.send.bind(resultChan));
        }
    }

    function* displaySearchResults(resultChan) {
        var res,
            lines;

        while (res = yield resultChan.get()) {
            lines = res.error && ['<h1>' + res.error + '</h1>'] || res[0] && res[1];
            results.innerHTML = lines.map(function(line) {
                return '<p>' + line + '</p>';
            }).join('');
        }
    }

    function* getUserSearchInput(requestChan) {
        var pacedKeyup = pace(300, listen(input, 'keyup')),
            evt,
            text,
            previousText,
            minLength;

        while (evt = yield pacedKeyup.get()) {
            text = evt.target.value;
            minLength = text.length > 2;

            if (minLength && text !== previousText) {
                requestChan.send(text);
            } else if (!minLength) {
                results.innerHTML = '';
            }

            previousText = text;
        }
    }
};

main(Routines.Chan, Routines.go, Routines.listen, Routines.pace);
