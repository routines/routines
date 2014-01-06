var fs = require('fs'),
    regenerator = require('regenerator');

module.exports = function(grunt) {
    // Building the template file for the regenerator task.
    grunt.registerMultiTask('regenerator', 'Facebook Regenerator.', function() {
        var options = this.options(),
            done = this.async();

        options.files.forEach(function(file) {

            fs.readFile(file.src, function(err, src) {
                if (err) {
                    grunt.log.error('Error writing to: ' + [file.src, err].join(' : '));
                    return;
                }

                var output = regenerator(src.toString(), options.regeneratorOptions);

                fs.writeFile(file.dest, output, function(err) {
                    if (err) {
                        grunt.log.error('Error writing to: ' + [file.out, err].join(' : '));
                    }
                    done();
                });
            });

        });
    });
};
