// test-linebuffer.js
// (c) Harald Rudell 2012

var linebuffer = require('../lib/linebuffer')

exports.testEmpty = testEmpty
exports.testOneLine = testOneLine
exports.testNoNewline = testNoNewline
exports.testTwoLineBuffer = testTwoLineBuffer
exports.testThreeBufferLine = testThreeBufferLine
exports.testTooLong = testTooLong

function testEmpty(test) {

	// an empty buffer
	var buf = linebuffer.getBuffer()

	// should be an object
	test.ok(typeof buf === 'object')

	// with no lines
	test.strictEqual(buf.getLine(), false)

	// and no final characters
	test.strictEqual(buf.getLast(), false)

	test.done()
}

function testOneLine(test) {

	// a one-line buffer
	var expected = 'a'
	var input = expected + '\n'
	var buf = linebuffer.getBuffer()
	buf.put(input)

	// should have one line
	test.equal(buf.getLine(), expected)

	// but not two
	test.strictEqual(buf.getLine(), false)

	// and no additional characters
	test.strictEqual(buf.getLast(), false)

	test.done()
}

function testNoNewline(test) {

	// a no-newline buffer
	var expected = 'a'
	var buf = linebuffer.getBuffer()
	buf.put(expected)

	// should have no lines
	test.strictEqual(buf.getLine(), false)

	// and some final characters
	test.equal(buf.getLast(), expected)

	// but only once
	test.strictEqual(buf.getLast(), false)

	test.done()
}

function testTwoLineBuffer(test) {

	//a two-line buffer
	var expected1 = 'a'
	var expected2 = 'b'
	var input = expected1 + '\n' + expected2 + '\n'
	var buf = linebuffer.getBuffer()
	buf.put(input)

	// should have a first line
	test.equal(buf.getLine(), expected1)

	// and a second line
	test.equal(buf.getLine(), expected2)

	// but not a third line
	test.strictEqual(buf.getLine(), false)

	// and no additional characters
	test.strictEqual(buf.getLast(), false)

	test.done()
}

function testThreeBufferLine(test) {

	// a triple-buffers buffer with one line and add'l characters
	var input1 = 'a'
	var input2 = 'b'
	var char3 = 'c'
	var char4 = 'd'
	var input3 = char3 + '\n' + char4
	var expected1 =  input1 + input2 + char3
	var expected2 = char4
	var buf = linebuffer.getBuffer()
	buf.put(input1)
	buf.put(input2)
	buf.put(input3)

	// should have one line
	test.equal(buf.getLine(), expected1)

	// but not two
	test.strictEqual(buf.getLine(), false)

	// and add'l characters
	test.equal(buf.getLast(), expected2)

	// but not twice
	test.strictEqual(buf.getLast(), false)

	test.done()
}

function testTooLong(test) {
	
	// a 3-character line buffer with a 2-character limit
	var buf = linebuffer.getBuffer(2)
	buf.put('abc')

	// should produce an error
	test.ok(buf.getLine() instanceof Error)

	// a 3-character with newline line buffer with a 2-character limit
	var buf = linebuffer.getBuffer(2)
	buf.put('abc\n')

	// should produce an error	
	test.ok(buf.getLine() instanceof Error)

	// a buffer with a one character line followed by 3 extra characters
	var expected = 'a'
	var input = expected + '\nbcd'
	var buf = linebuffer.getBuffer(2)
	buf.put(input)

	// should have one line
	test.equal(buf.getLine(), 'a')

	// and tgen product an error
	test.ok(buf.getLast() instanceof Error)

	test.done()
}