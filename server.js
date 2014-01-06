var express = require('express');
var path = require('path');
var app = express();

app
    .use('/', express.static(path.join(__dirname, '/')))
    .use('/', express.directory(path.join(__dirname, '/')))
    .listen('3000');
