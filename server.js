var express = require('express');
var path = require('path');
var app = express();

app
    .use('/', express.static(path.join(__dirname, '/demos')))
    .use('/', express.directory(path.join(__dirname, '/demos')))
    .listen('3000');
