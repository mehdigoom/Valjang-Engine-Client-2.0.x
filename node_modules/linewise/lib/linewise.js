// linewise.js
// a stream pipe that converts to utf-8 and outputs line by line
// (c) Harald Rudell 2012

var linebuffer = require('./linebuffer')
// http://nodejs.org/api/stream.html
var stream = require('stream')

exports.getPerLineBuffer = getPerLineBuffer

/*
a stream-to-stream buffer that converts to utf-8 and outputs line by line
opts: optional object
.maxLength: optional number: lines longer than this cause Error, default none
.noPause: optional boolean: do not pause upstream, default true
*/
function getPerLineBuffer(opts) {
	if (typeof opts != 'object') opts = Object(opts)
	var buffer = linebuffer.getBuffer(opts.maxLength)
	var pause
	var isEnd
	var sentAll
	var sentEnd
	var isCancel
	var upstreamPaused

	// base on Stream
	var self = new stream.Stream
	// both read and write
	self.writable = true
	self.readable = true
	// as a write stream, we will get write invocations
	self.write = write
	// write stream will get a final end invocation
	self.end = end
	// as a read stream, we will get a pipe invocation
	// we will use the default pipe provided by Stream
	// as a read stream we will get resume and pause invocations
	self.resume = resume
	self.pause = pause
	// the read stream will also emit 'data' 'end' 'drain' and 'error' to itself
	return self

	function resume() {
		pause = false
		pushData()
	}
	function pause() {
		pause = true
	}
	function write(data) {
		var result = true

		if (!isCancel && data) {

			// save to buffer
			if (data instanceof Buffer) data = data.toString()
			else if (typeof data != 'string') data = String(data)
			buffer.put(data)

			// emit data if not paused
			if (!pause) pushData()

			// pause if appropriate
			result = !shouldPauseUpstream()
		}

		return result
	}

	function end() {
		isEnd = true
		if (buffer.isEmpty()) sentAll = true
		pushData()
	}

	function shouldPauseUpstream() {
		var result = false
		if (!opts.noPause && buffer.hasTwoAndNewline()) {
			result = upstreamPaused = true
		}
		return result
	}

	function unpauseUpstream() {
			self.emit('drain')
			upstreamPaused = false		
	}

	function pushData() {
		var line

		// send complete lines until pause, error or out of data
		if (!pause) {
			for (;;) {
				if (upstreamPaused && !buffer.hasTwoAndNewline()) unpauseUpstream()
				if (typeof (line = buffer.getLine()) != 'string') break
				self.emit('data', line)
			}

			// send remaining characters if end was invoked
			// if not pause or error
			if (!(line instanceof Error) && isEnd) {
				if (typeof (line = buffer.getLast()) == 'string') self.emit('data', line)
				if (!(line instanceof Error)) sentAll = true
			}

			// deal with errors - we cancel on error
			if (line instanceof Error) {
				isCancel = true
				self.emit('error', line.toString())
			}
		}

		// send end if all sent and not done already
		if (!isCancel && sentAll &&!sentEnd) {
			sentEnd = true
			self.emit('end')
		}
	}
}