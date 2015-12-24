'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _slaveCode = require('./slave-code');

var _slaveCode2 = _interopRequireDefault(_slaveCode);

var slaveCodeDataUri = 'data:text/javascript;charset=utf-8,' + encodeURI(_slaveCode2['default']);
var createBlobURL = window.createBlobURL || window.createObjectURL;

if (!createBlobURL) {
  var _URL = window.URL || window.webkitURL;

  if (_URL) {
    createBlobURL = _URL.createObjectURL;
  } else {
    throw new Error('No Blob creation implementation found.');
  }
}

if (typeof window.BlobBuilder === 'function' && typeof createBlobURL === 'function') {
  var blobBuilder = new window.BlobBuilder();
  blobBuilder.append(_slaveCode2['default']);
  slaveCodeDataUri = createBlobURL(blobBuilder.getBlob());
} else if (typeof window.Blob === 'function' && typeof createBlobURL === 'function') {
  var blob = new window.Blob([_slaveCode2['default']], { type: 'text/javascript' });
  slaveCodeDataUri = createBlobURL(blob);
}

exports['default'] = slaveCodeDataUri;
module.exports = exports['default'];
//# sourceMappingURL=slave-code-uri.js.map
