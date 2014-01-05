var fs = require('fs'),
    regenerator = require('regenerator');

module.exports = function(grunt) {
    // Building the template file for the regenerator task.
    grunt.registerMultiTask('regenerator', 'Facebook Regenerator.', function() {
        var options = this.options(),
            done = this.async();

        fs.readFile(options.input, function(err, src) {
            if (err) {
                grunt.log.error('Error writing to: ' + [options.input, err].join(' : '));
                return;
            }

            var output = regenerator(src.toString(), options.regeneratorOptions);

            fs.writeFile(options.out, output, function(err) {
                if (err) {
                    grunt.log.error('Error writing to: ' + [options.out, err].join(' : '));
                }
                done();
            });
        });
    });
};
