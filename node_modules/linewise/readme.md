# Linewise

The linewise module splits a stream line-by-line with moderation of the input.

## Benefits

* An unlimited amount of text can be processed
* A line or sequence of lines can for example be scanned for patterns
* Suitable for processing logs

## Features

* Node stream interface
* Moderation of the input stream limits memory use
* Any read stream can be parsed, likewise output can be sent to any stream

# Usage

```js
var linewise = require('linewise')
var fs = require('fs')

var inStream = fs.createReadStream('/home/hugefile.log', {encoding:'utf-8'})
var parsedStream = linewise.getPerLineBuffer()
parsedStream.on('data', line)
parsedStream.on('end', end)
parsedStream.on('error', error)
inStream.pipe(parsedStream)
parsedStream.resume()

function line(text) {
	console.log(text)
}

function end() {
	console.log('End of file.')
}

function error(err) {
	throw Error(err)
}
```

# TODO

* Make it work for Windowsy Macy systems: '\r\n', '\r'

# Notes

(c) [Harald Rudell](http://www.haraldrudell.com) wrote this for the love of node in August, 2012

No warranty expressed or implied. Use at your own risk.

Please suggest better ways, new features, and possible difficulties on [github](https://github.com/haraldrudell/webfiller)