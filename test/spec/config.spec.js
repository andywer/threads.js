'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _expectJs = require('expect.js');

var _expectJs2 = _interopRequireDefault(_expectJs);

var _ = require('../../');

function cloneWithMods(obj, callback) {
  var clone = JSON.parse(JSON.stringify(obj));
  callback(clone);

  return clone;
}

describe('Config', function () {

  it('can be read', function () {
    var initialConfig = _.config.get();
    (0, _expectJs2['default'])(initialConfig).to.be.a('object');
  });

  it('can override existing properties', function () {
    var initialConfig = _.config.get();
    var newConfigFragment = {
      basepath: { web: '/scripts' }
    };

    _.config.set(newConfigFragment);
    var expectedNewConfig = cloneWithMods(initialConfig, function (configObj) {
      configObj.basepath.web = '/scripts';
    });

    (0, _expectJs2['default'])(_.config.get()).to.eql(expectedNewConfig);
  });

  it('can set custom properties', function () {
    _.config.set({ someUnknownProp: 'test' });
    (0, _expectJs2['default'])(_.config.get().someUnknownProp).to.eql('test');
  });

  it('prevents setting a string config to an object', function () {
    (0, _expectJs2['default'])(function () {
      _.config.set({
        basepath: {
          web: { illegal: 'object' }
        }
      });
    }).to.throwError(/Expected config property not to be an object: basepath.web/);
  });

  it('prevents setting an object config to a string', function () {
    (0, _expectJs2['default'])(function () {
      _.config.set({
        basepath: 'no string allowed here'
      });
    }).to.throwError(/Expected config property to be an object: basepath/);
  });
});