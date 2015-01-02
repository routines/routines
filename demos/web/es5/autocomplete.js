function main(Chan, go, listen,  pace) {
    var search = regeneratorRuntime.mark(function search(requestChan, resultChan) {
        var searchTerm, httpRequest;

        return regeneratorRuntime.wrap(function search$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
            case 0:
                context$2$0.next = 2;
                return requestChan.get();
            case 2:
                if (!(searchTerm = context$2$0.sent)) {
                    context$2$0.next = 7;
                    break;
                }

                httpRequest && httpRequest.abort();
                httpRequest = $.getJSON(wikipediaUrl + encodeURIComponent(searchTerm),
                                        resultChan.send.bind(resultChan));
                context$2$0.next = 0;
                break;
            case 7:
            case "end":
                return context$2$0.stop();
            }
        }, search, this);
    });

    var displaySearchResults = regeneratorRuntime.mark(function displaySearchResults(resultChan) {
        var res, lines;

        return regeneratorRuntime.wrap(function displaySearchResults$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
            case 0:
                context$2$0.next = 2;
                return resultChan.get();
            case 2:
                if (!(res = context$2$0.sent)) {
                    context$2$0.next = 7;
                    break;
                }

                lines = res.error && ['<h1>' + res.error + '</h1>'] || res[0] && res[1];
                results.innerHTML = lines.map(function(line) {
                    return '<p>' + line + '</p>';
                }).join('');
                context$2$0.next = 0;
                break;
            case 7:
            case "end":
                return context$2$0.stop();
            }
        }, displaySearchResults, this);
    });

    var getUserSearchInput = regeneratorRuntime.mark(function getUserSearchInput(requestChan) {
        var pacedKeyup, evt, text, previousText, minLength;

        return regeneratorRuntime.wrap(function getUserSearchInput$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
            case 0:
                pacedKeyup = pace(300, listen(input, 'keyup'));
            case 1:
                context$2$0.next = 3;
                return pacedKeyup.get();
            case 3:
                if (!(evt = context$2$0.sent)) {
                    context$2$0.next = 10;
                    break;
                }

                text = evt.target.value;
                minLength = text.length > 2;

                if (minLength && text !== previousText) {
                    requestChan.send(text);
                } else if (!minLength) {
                    results.innerHTML = '';
                }

                previousText = text;
                context$2$0.next = 1;
                break;
            case 10:
            case "end":
                return context$2$0.stop();
            }
        }, getUserSearchInput, this);
    });

    var input = document.getElementById('searchtext'),
        results = document.getElementById('results'),
        wikipediaUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&format=json&callback=?&search=',
        searchRequestChan = new Chan(),
        searchResultsChan = new Chan();

    go(search, [searchRequestChan, searchResultsChan]);
    go(displaySearchResults, [searchResultsChan]);
    go(getUserSearchInput, [searchRequestChan]);
};

main(Routines.Chan, Routines.go, Routines.listen, Routines.pace);
