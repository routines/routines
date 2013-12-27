(function(Channel, go, listen, unique, pace, jsonp) {

    function searchWikipedia(term) {
        var url = 'http://en.wikipedia.org/w/api.php?action=opensearch&format=json&callback=?&search=' +
                encodeURIComponent(term);
        return jsonp(url);
    }

    go(function* () {
        var input = document.getElementById('searchtext'),
            results = document.getElementById('results'),
            keyup = unique(listen(input, 'keyup')),
            pacedKeyup = pace(keyup, 750),
            evt,
            data,
            res,
            i,
            len,
            p,
            text;
        
        while (true) {
            evt = yield pacedKeyup.get();
            text = evt.target.value;
            
            if (text.length > 2) {
                data = yield searchWikipedia(text).get();
                
                if (data.error) {
                    results.innerHTML = '<h1p>Error:</h1>' + JSON.stringify(data.error);
                } else {                    
                    if (data[0] && data[1]) {
                        results.innerHTML = '';
                        res = data[1];
                        for (i = 0, len = res.length; i < len; i++) {
                            p = document.createElement('p');
                            p.innerHTML = res[i];
                            results.appendChild(p);
                        }                
                    }
                }
            }
        }
    });

})($async.Channel, $async.go, $async.listen, $async.unique, $async.pace, $async.jsonp);
