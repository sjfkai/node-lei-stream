/**
 * lei-stream
 * 
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

var utils = require('./utils');

var instanceCounter = 0;

/**
 * ReadLineStream
 * 
 * @param {Object} stream
 * @param {Object} options
 * @return {Object}
 */
function ReadLineStream (stream, options) {
  if (!(this instanceof ReadLineStream)) return new ReadLineStream(stream, options);
  
  instanceCounter++;
  this._debug = utils.debug('ReadLineStream:#' + instanceCounter);
  this._debug('init');
  
  if (!stream) throw new Error('missing parameter `stream`');
  if (typeof stream.on !== 'function') return new Error('no method `on` on parameter `stream`');
  options = options || {};
  options.newline = options.newline || '\n';
  options.autoNext = !!options.autoNext;
  options.encoding = options.encoding || utils.parseJSON;
  this._options = options;
  this._stream = stream;
  this._buffer = '';
  this._lines = 0;
  this._ended = false;
  this._waitNext = false;
  
  var self = this;
  stream.on('data', function (chunk) {
    self._debug('stream on data: %s bytes', chunk.length);
    self._onData(chunk);
  });
  stream.on('end', function () {
    self._debug('stream on end');
    self._ended = true;
    self.next();
    self.emit('end');
  });
}

utils.inheritsEventEmitter(ReadLineStream);

ReadLineStream.prototype._onData = function (chunk) {
  this._stream.pause();
  this._buffer += chunk;
  if (this._lines < 1) return this.next();
  if (this._options.autoNext) return this.next();
  if (this._waitNext) {
    this._waitNext = false;
    return this.next();
  }
};

ReadLineStream.prototype.next = function () {
  this._debug('next');
  if (this._ended && !this._buffer) return;
  
  var i = this._buffer.indexOf(this._options.newline);
  if (i === -1) {
    if (!this._ended) {
      this._debug('only %s bytes, not enough buffer, resume stream', this._buffer.length);
      this._waitNext = true;
      return this._stream.resume();
    }
    this._debug('stream is ended, last buffer: %s', this._buffer);
    i = this._buffer.length;
  }

  var item = this._buffer.slice(0, i);
  this._buffer = this._buffer.slice(i + this._options.newline.length);
  this._lines++;
  this._debug('emit data: %s bytes', item.length);
  this.emit('data', this._options.encoding(item));
  
  if (this._options.autoNext) {
    var self = this;
    process.nextTick(function () {
      self.next();
    });
  }
};

ReadLineStream.prototype.close = function () {
  this._debug('close');
  return this._stream.close();
};


module.exports = ReadLineStream;