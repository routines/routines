function main(Pipe, job, listen,  pace) {
    
    var input = document.getElementById('searchtext'),
        results = document.getElementById('results'),
        wikipediaUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&format=json&callback=?&search=',
        searchRequestPipe = new Pipe(),
        searchResultsPipe = new Pipe();

    job(search, [searchRequestPipe, searchResultsPipe]);
    job(displaySearchResults, [searchResultsPipe]);
    job(getUserSearchInput, [searchRequestPipe]);


    function* search(requestPipe, resultPipe) {
        var searchTerm,
            httpRequest;
        
        while (searchTerm = yield requestPipe.get()) {
            if (httpRequest) { // If there is an existing API request in flight, cancel it. 
                httpRequest.abort();
            }
            
            httpRequest = $.getJSON(wikipediaUrl + encodeURIComponent(searchTerm),
                                    resultPipe.send.bind(resultPipe));
        }
    }

    function* displaySearchResults(resultPipe) {
        var res,
            lines,
            html;
        
        while (res = yield resultPipe.get()) {
            lines = res.error && ['<h1>' + res.error + '</h1>'] || res[0] && res[1];
            html = lines.map(function(line) { return '<p>' + line + '</p>'; });
            results.innerHTML = html.join('');
        }
    }

    function* getUserSearchInput(requestPipe) {
        var pacedKeyup = pace(300, listen(input, 'keyup')),
            evt,
            text,
            previousText,
            minLength;
        
        while (evt = yield pacedKeyup.get()) {
            text = evt.target.value;
            minLength = text.length > 2;

            if (minLength && text !== previousText) {
                requestPipe.send(text);                
            } else if (!minLength) {
                results.innerHTML = '';
            }

            previousText = text;
        }        
    }
};

main(JSPipe.Pipe, JSPipe.job, JSPipe.listen, JSPipe.pace);
