var sweetjs = require('sweet.js'),
    fs = require('fs');

module.exports = function(grunt) {
    
    grunt.registerMultiTask('browser', "Export a module to the window", function() {

        var opts = this.options(),
            output = [],
            namespace = opts.namespace,
            text = opts.src.map(grunt.file.read).join(''),
            exportPattern = /export {(.|\n)+};/,
            exportText = text.match(exportPattern)[0],
            modulePatternExportText,
            exportMacro = fs.readFileSync('./macros/export.sjs').toString();

        // Get the real namespace into the sweet.js macro
        
        exportText = exportMacro.replace('NAMESPACE', namespace) + exportText;
        modulePatternExportText = sweetjs.compile(exportText).code;
        text = text.replace(exportPattern, modulePatternExportText);

        output.push('(function(global) {');

        // Insert an early return
        output.push('if (global.' + namespace + ') { return; }');

        output.push(text);
        
        output.push('})(typeof global !== "undefined" ? global : this);');

        grunt.file.write(opts.dest, output.join('\n'));
    });

};
