// test-linewise.js
// (c) Harald Rudell 2012

var linewise = require('../lib/linewise')
// http://nodejs.org/api/fs.html
var fs = require('fs')
// http://nodejs.org/api/path.html
var path = require('path')

exports.testStream = testStream
exports.testPause = testPause

function testStream(test) {
	var expected = [ 'a', 'b1']
	var cbCount = 0

	var file = path.join(__dirname, 'data', 'a.txt')
	var inStream = fs.createReadStream(file)
	var parsedStream = linewise.getPerLineBuffer()
	parsedStream.on('data', line)
	parsedStream.on('end', end)
	parsedStream.on('error', error)
	inStream.pipe(parsedStream)
	parsedStream.resume()

	function line(text) {
		test.equal(text, expected[cbCount])
		cbCount++
	}

	function end() {
		test.equal(cbCount, 2)

		test.done()
	}

	function error(err) {
		test.fail('Error:' + err)
	}
}

function testPause(test) {
	var expected = [ 'a', 'b1']
	var cbCount = 0

	var file = path.join(__dirname, 'data', 'a.txt')
	var inStream = fs.createReadStream(file, {bufferSize: 1})
	var parsedStream = linewise.getPerLineBuffer()
	parsedStream.on('data', line)
	parsedStream.on('end', end)
	parsedStream.on('error', error)
	inStream.pipe(parsedStream)
	// start the fs read
	parsedStream.resume()
	// prevent data events
	parsedStream.pause()
	// wait for the filesystem to have data
	setTimeout(f, 500)

	function f() {
		// unblock filesystem
		parsedStream.resume()
	}

	function line(text) {
		test.equal(text, expected[cbCount])
		cbCount++
	}

	function end() {
		test.equal(cbCount, 2)

		test.done()
	}

	function error(err) {
		test.fail('Error:' + err)
	}
}
