var fs = require('fs');

module.exports = function(grunt) {

    grunt.registerTask('ensureSpecDirectories', 'Ensure Spec Directories exist', function() {
        
        if (!fs.existsSync('spec-es5')) {
            fs.mkdirSync('spec-es5');
        }

    });

};
