var express = require('express');
var path = require('path');

var app = express()
    .use('/coverage', express.directory(path.join(__dirname, 'coverage')))
    .use('/coverage', express.static(path.join(__dirname, 'coverage')))
    .listen('3000');
