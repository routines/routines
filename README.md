# JS/Pipe

JS/Pipe is a minimal library that makes it easy to *coordinate asynchronous code* without callbacks or chained functions.

As a result, stack traces are crystal clear so debugging is easy. You can also use try/catch to manage error handling.

JS/Pipe is inspired by Goroutines and Channels, found in the Go language. 

Read more and see live examples at http://jspipe.org

## Getting Started

### Building
1. Clone this repo: `git clone git@github.com:jspipe/jspipe.git`
2. Install dev dependencies: `sh init.sh`
3. Build: `grunt build`

Both ES5 and ES6 builds are produced (in the /dist-es5 and /dist-es6 directories respectively) and for each the build output includes modules in the AMD, CommonJS, and module pattern formats. 


### Browser

#### Browsers that support ES6 Generators
JS/Pipe relies on Generators, introduced in ES6. Currently, Firefox supports ES6 Generators. Chrome also supports generators, but you must first enable it in chrome:flags / #enable-javascript-harmony.

To use JS/Pipe, simply build it by running `grunt build`, and picking one of the jspipe.js files in /dist-es6.
The build produces three outputs: AMD, CommonJS, and module pattern format. 

#### All other browsers
The build produces not only ES6 code in /dist-es6, but also ES5-compatible code in /dist-es5. The ES5 code is produced by transpiling the ES6 source code using Facebook's Regenerator, which converts generator syntax into a state machine. The /dist-es5 folder also includes generator-runtime.js, which you must include in your ES5 project.

To run your project that uses JS/Pipes in non-ES6 browsers, you need to include the following scripts:
a) jspipe.js from /dist-es5
b) generator-runtime.js from /dist-es5
c) your script, transpiled using Facebook Regenerator

You can get Facebook Regenerator by running `npm install -g regenerator`. It is hosted at https://github.com/facebook/regenerator


### Node
JS/Pipe is published as an NPM package for Node 0.11.10+ when running with the --harmony flag.

`npm install jspipe`


## Generators

JS/Pipe relies on JavaScript Generators, introduced in ES6. For your code to work in current JavaScript environments you need to use a transpiler that converts ES6 Generator syntax to ES5 semantics. Two popular ways are Google Traceur (which supports not only Generators, but also many other ES6 features like lambda syntax, destructuring, etc.) and Facebook Regenerator (which focuses on Generator support only). 

We use Facebook Regenerator. 








------

JS/Pipe is free software distributed under the terms of the MIT license reproduced here.

JS/Pipe may be used for any purpose, including commercial purposes, at absolutely no cost.
No paperwork, no royalties, no GNU-like "copyleft" restrictions, either.
Just download it and use it.

Copyright (c) 2013, 2014 Joubert Nel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
