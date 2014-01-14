var fs = require('fs'),
    jspipe = require('jspipe'),
    Pipe = jspipe.Pipe,
    job = jspipe.job,
    filenames = ['file1.txt', 'file2.txt', 'file3.txt'];

function denode(fn, args) {
    var pipe = new Pipe(),
        newArgs = args instanceof Array ? args : [args];

    newArgs.push(function(err, data) {
        var result = err ? {err:err} : {data:data};
        pipe.send(result);
    });
    
    fn.apply(fn, newArgs);
    return pipe.get();
}


job(function* () {
    var msg,
        i,
        filedata = [];
    
    for (i in filenames) {
        msg = yield denode(fs.readFile, filenames[i]);
        filedata[i] = msg.data ? msg.data.toString('utf8') : msg.err;
    }

    console.log(filedata);
});



