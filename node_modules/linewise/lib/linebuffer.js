// linebuffer.js
// gets string buffers as input, outputs line by line
// (c) Harald Rudell 2012

exports.getBuffer = getBuffer

/*
receive string data buffers, output text line by line
maxLength: optional number: if a longer line length encountered, Error is returned
put(data): data: string
getLine(): return s a text line, false if no test line is available, Error if too long line found
getLast(): return remaining characters, false if none availkable, Error if too long line
*/
function getBuffer(maxLength) {
	var buffer0pos = 0
	var nextScan = 0
	var buffers = []
	nlPos = -1
	return {
		put: put,
		getLine: getLine,
		getLast: getLast,
		hasTwoAndNewline: hasTwoAndNewline,
		isEmpty: isEmpty,
	}
	function put(data) {
		buffers.push(data)
	}
	function getLine() {
		var result = false

		// extract the line
		// from buffers[0].buffer0pos to buffers[nextScan].pos
		if (getNlPos() != -1) {
			if (nextScan == 0) {
				// newline was in buffer 0
				result = buffers[0].substring(buffer0pos, nlPos)
			} else {
				// text is from multiple buffers
				result = Array(
					buffers[0].substring(buffer0pos),
					buffers.slice(1, nextScan),
					buffers[nextScan].substring(0, nlPos)
					).join('')
				buffers.splice(0, nextScan)
			}
			// update buffer0pos and nextScan
			if (nlPos == buffers[0].length - 1) {
				// it was the last character of buffer 0
				buffers.shift()
				buffer0pos = 0
			} else buffer0pos = nlPos + 1
			nextScan = 0
			nlPos = -1
			if (maxLength && maxLength < result.length) result = Error('Maxlength exceeded:' + result.length)
		} else if (maxLength) {
			// no newline yet, verify maxLength not exceeded
			var count = 0
			buffers.forEach(function (buffer) {
				count += buffer.length
			})
			count -= buffer0pos
			if (count > maxLength) result = Error('Maxlength exceeded:' + count)
		}

		return result
	}
	function getLast() {
		result = false
		if (buffers.length) {
			result = Array(
				buffers[0].substring(buffer0pos),
				buffers.slice(1, buffers.length)
				).join('')
			buffers = []
			buffer0pos = 0
			nlPos = -1
			nextScan = 0
			if (maxLength && maxLength < result.length) result = Error('Maxlength exceeded:' + result.length)
		}
		return result
	}
	function hasTwoAndNewline() {
		var result = buffers.length > 1 && getNlPos() != -1
		return result
	}
	function isEmpty() {
		return buffers.length == 0
	}
	function getNlPos() {
		if (nlPos == -1 && nextScan < buffers.length) {

			// deal with buffers[0]
			if (nextScan == 0) if ((nlPos = buffers[0].indexOf('\n', buffer0pos)) == -1) nextScan++

			// look in possible other buffers
			if (nlPos == -1) while (nextScan < buffers.length) {
				if ((nlPos = buffers[nextScan].indexOf('\n')) != -1) break
				nextScan++
			}
		}
		return nlPos
	}
}