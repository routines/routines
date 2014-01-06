var regenerator = require('regenerator'),
    fs = require('fs');

module.exports = function(grunt) {
    
    grunt.registerTask('createGeneratorRuntime', 'Generator Runtime', function() {
        var noSource = '',
            options = this.options(),
            runtimeOutput = regenerator(noSource, { includeRuntime: true });

        fs.writeFileSync(options.dest, runtimeOutput);
    });


};
