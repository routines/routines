var fs = require('fs'),
    jspipe = require('jspipe'),
    Pipe = jspipe.Pipe,
    job = jspipe.job,
    filenames = ['file1.txt', 'file2.txt', 'file3.txt'];


function readfile(filename) {
    var pipe = new Pipe();
    
    fs.readFile(filename, function(err, data) {
        if (err) {
            pipe.send({err: err});
        } else {
            pipe.send({data: data});
        }
    });
    
    return pipe;
}


job(function* () {
    var fileData = [],
        message,
        index,
        file;

    for (index in filenames) {
        file = filenames[index];
        message = yield readfile(file).get();
        
        fileData[index] =
            message.data ?
            message.data.toString('utf8') :
            message.err;
    }

    console.log(fileData);
});



