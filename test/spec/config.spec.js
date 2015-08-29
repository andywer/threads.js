'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _expectJs = require('expect.js');

var _expectJs2 = _interopRequireDefault(_expectJs);

var _lib = require('../../lib');

function cloneWithMods(obj, callback) {
  var clone = JSON.parse(JSON.stringify(obj));
  callback(clone);

  return clone;
}

describe('Config', function () {

  it('can be read', function () {
    var initialConfig = _lib.config.get();
    (0, _expectJs2['default'])(initialConfig).to.be.a('object');
  });

  it('can override existing properties', function () {
    var initialConfig = _lib.config.get();
    var newConfigFragment = {
      basepath: { web: '/scripts' }
    };

    _lib.config.set(newConfigFragment);
    var expectedNewConfig = cloneWithMods(initialConfig, function (configObj) {
      configObj.basepath.web = '/scripts';
    });

    (0, _expectJs2['default'])(_lib.config.get()).to.eql(expectedNewConfig);
  });

  it('can set custom properties', function () {
    _lib.config.set({ someUnknownProp: 'test' });
    (0, _expectJs2['default'])(_lib.config.get().someUnknownProp).to.eql('test');
  });

  it('prevents setting a string config to an object', function () {
    (0, _expectJs2['default'])(function () {
      _lib.config.set({
        basepath: {
          web: { illegal: 'object' }
        }
      });
    }).to.throwError(/Expected config property not to be an object: basepath.web/);
  });

  it('prevents setting an object config to a string', function () {
    (0, _expectJs2['default'])(function () {
      _lib.config.set({
        basepath: 'no string allowed here'
      });
    }).to.throwError(/Expected config property to be an object: basepath/);
  });
});