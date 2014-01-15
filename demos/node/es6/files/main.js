var fs = require('fs'),
    jspipe = require('jspipe'),
    Pipe = jspipe.Pipe,
    job = jspipe.job,
    denode = jspipe.denode,
    filenames = ['file1.txt', 'file2.txt', 'file3.txt'];

job(function* () {
    var msg,
        i,
        filedata = [];
    
    for (i in filenames) {
        msg = yield denode(fs.readFile, filenames[i]).get();
        filedata[i] = msg.data ? msg.data.toString('utf8') : msg.err;
    }

    console.log(filedata);
});



