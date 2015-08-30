require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*eslint-env browser, amd, commonjs*/
/*global module*/

'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

if (typeof window === 'object') {
  window.thread = _index2['default'];
}

if (typeof define === 'function') {
  define([], function () {
    return _index2['default'];
  });
} else if (typeof module === 'object') {
  module.exports = _index2['default'];
}
//# sourceMappingURL=bundle.browser.js.map
},{"./index":3}],"./worker":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x5, _x6, _x7) { var _again = true; _function: while (_again) { var object = _x5, property = _x6, receiver = _x7; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x5 = parent; _x6 = property; _x7 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _eventemitter3 = require('eventemitter3');

var _eventemitter32 = _interopRequireDefault(_eventemitter3);

var _slaveCode = require('./slave-code');

var _slaveCode2 = _interopRequireDefault(_slaveCode);

var _config = require('../config');

if (typeof window.Worker !== 'object' && typeof window.Worker !== 'function') {
  throw new Error('Browser does not support web workers!');
}

var slaveCodeDataUri = 'data:text/javascript;charset=utf-8,' + encodeURI(_slaveCode2['default']);

function prependScriptUrl(scriptUrl) {
  var prefix = (0, _config.getConfig)().basepath.web;
  return prefix ? prefix + '/' + scriptUrl : scriptUrl;
}

var Worker = (function (_EventEmitter) {
  _inherits(Worker, _EventEmitter);

  function Worker() {
    var initialScript = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];
    var importScripts = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

    _classCallCheck(this, Worker);

    _get(Object.getPrototypeOf(Worker.prototype), 'constructor', this).call(this);

    this.worker = new window.Worker(slaveCodeDataUri);
    this.worker.addEventListener('message', this.handleMessage.bind(this));
    this.worker.addEventListener('error', this.handleError.bind(this));

    if (initialScript) {
      this.run(initialScript, importScripts);
    }
  }

  _createClass(Worker, [{
    key: 'run',
    value: function run(toRun) {
      var importScripts = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

      if (typeof toRun === 'function') {
        this.runMethod(toRun, importScripts);
      } else {
        this.runScripts(toRun, importScripts);
      }
      return this;
    }
  }, {
    key: 'runMethod',
    value: function runMethod(method, importScripts) {
      var methodStr = method.toString();
      var args = methodStr.substring(methodStr.indexOf('(') + 1, methodStr.indexOf(')')).split(',');
      var body = methodStr.substring(methodStr.indexOf('{') + 1, methodStr.lastIndexOf('}'));

      this.worker.postMessage({
        initByMethod: true,
        method: { args: args, body: body },
        scripts: importScripts
      });
    }
  }, {
    key: 'runScripts',
    value: function runScripts(script, importScripts) {
      if (!script) {
        throw new Error('Must pass a function or a script URL to run().');
      }

      // attention: array for browser, single script for node
      this.worker.postMessage({
        initByScripts: true,
        scripts: importScripts.concat([script]).map(prependScriptUrl)
      });
    }
  }, {
    key: 'send',
    value: function send(param) {
      var transferables = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

      this.worker.postMessage({
        doRun: true,
        param: param
      }, transferables);
      return this;
    }
  }, {
    key: 'kill',
    value: function kill() {
      this.worker.terminate();
      this.emit('exit');
      return this;
    }
  }, {
    key: 'handleMessage',
    value: function handleMessage(event) {
      if (event.data.error) {
        this.handleError(event.data.error);
      } else {
        this.emit('message', event.data.response);
      }
    }
  }, {
    key: 'handleError',
    value: function handleError(error) {
      if (!this.listeners('error', true)) {
        if (error.stack) {
          console.error(error.stack); // eslint-disable-line no-console
        } else if (error.message && error.filename && error.lineno) {
            var fileName = error.filename.match(/^data:text\/javascript/) && error.filename.length > 50 ? error.filename.substr(0, 50) + '...' : error.filename;
            console.error(error.message + ' @' + fileName + ':' + error.lineno); // eslint-disable-line no-console
          } else {
              console.error(error); // eslint-disable-line no-console
            }
      }
      this.emit('error', error);
    }
  }]);

  return Worker;
})(_eventemitter32['default']);

exports['default'] = Worker;
module.exports = exports['default'];
//# sourceMappingURL=../worker.browser/worker.js.map
},{"../config":2,"./slave-code":4,"eventemitter3":5}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.getConfig = getConfig;
exports.setConfig = setConfig;
var configuration = {
  basepath: {
    node: '',
    web: ''
  }
};

function configDeepMerge(destObj, srcObj) {
  var ancestorProps = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];

  Object.keys(srcObj).forEach(function (propKey) {
    var srcValue = srcObj[propKey];
    var ancestorPropsAndThis = ancestorProps.concat([propKey]);

    if (typeof srcValue === 'object') {
      if (typeof destObj[propKey] !== 'undefined' && typeof destObj[propKey] !== 'object') {
        throw new Error('Expected config property not to be an object: ' + ancestorPropsAndThis.join('.'));
      }
      configDeepMerge(destObj[propKey], srcValue, ancestorPropsAndThis);
    } else {
      if (typeof destObj[propKey] === 'object') {
        throw new Error('Expected config property to be an object: ' + ancestorPropsAndThis.join('.'));
      }
      destObj[propKey] = srcValue;
    }
  });
}

var config = {
  get: function get() {
    return configuration;
  },

  set: function set(newConfig) {
    if (typeof newConfig !== 'object') {
      throw new Error('Expected config object.');
    }

    configDeepMerge(configuration, newConfig);
  }
};

exports['default'] = config;

function getConfig() {
  return config.get();
}

function setConfig() {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return config.set.apply(config, args);
}
//# sourceMappingURL=config.js.map
},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.spawn = spawn;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _worker = require('./worker');

var _worker2 = _interopRequireDefault(_worker);

exports.config = _config2['default'];
exports.Worker = _worker2['default'];
// needed for testing

function spawn() {
  var runnable = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];

  return new _worker2['default'](runnable);
}

exports['default'] = {
  config: _config2['default'],
  spawn: spawn,
  Worker: _worker2['default']
};
//# sourceMappingURL=index.js.map
},{"./config":2,"./worker":"./worker"}],4:[function(require,module,exports){
module.exports = "/*eslint-env worker*/\n/*global importScripts*/\n/*eslint-disable no-console*/\nthis.module = {\n  exports : function() {\n    if (console) { console.error('No thread logic initialized.'); }\n  }\n};\n\nthis.onmessage = function (event) {\n  var scripts = event.data.scripts;\n  if (scripts && scripts.length > 0 && typeof importScripts !== 'function') {\n    throw new Error('importScripts() not supported.');\n  }\n\n  if (event.data.initByScripts) {\n    importScripts.apply(null, scripts);\n  }\n\n  if (event.data.initByMethod) {\n    var method = event.data.method;\n    this.module.exports = Function.apply(null, method.args.concat(method.body));\n\n    if (scripts && scripts.length > 0) {\n      importScripts.apply(null, scripts);\n    }\n  }\n\n  if (event.data.doRun) {\n    var handler = this.module.exports;\n    if (typeof handler !== 'function') {\n      throw new Error('Cannot run thread logic. No handler has been exported.');\n    }\n\n    handler(event.data.param, function(response) {\n      this.postMessage({ response : response });\n    }.bind(this));\n  }\n}.bind(this);\n";
},{}],5:[function(require,module,exports){
'use strict';

//
// We store our EE objects in a plain object whose properties are event names.
// If `Object.create(null)` is not supported we prefix the event names with a
// `~` to make sure that the built-in object properties are not overridden or
// used as an attack vector.
// We also assume that `Object.create(null)` is available when the event name
// is an ES6 Symbol.
//
var prefix = typeof Object.create !== 'function' ? '~' : false;

/**
 * Representation of a single EventEmitter function.
 *
 * @param {Function} fn Event handler to be called.
 * @param {Mixed} context Context for function execution.
 * @param {Boolean} once Only emit once
 * @api private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Minimal EventEmitter interface that is molded against the Node.js
 * EventEmitter interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() { /* Nothing to set */ }

/**
 * Holds the assigned EventEmitters by name.
 *
 * @type {Object}
 * @private
 */
EventEmitter.prototype._events = undefined;

/**
 * Return a list of assigned event listeners.
 *
 * @param {String} event The events that should be listed.
 * @param {Boolean} exists We only need to know if there are listeners.
 * @returns {Array|Boolean}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event, exists) {
  var evt = prefix ? prefix + event : event
    , available = this._events && this._events[evt];

  if (exists) return !!available;
  if (!available) return [];
  if (available.fn) return [available.fn];

  for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
    ee[i] = available[i].fn;
  }

  return ee;
};

/**
 * Emit an event to all registered event listeners.
 *
 * @param {String} event The name of the event.
 * @returns {Boolean} Indication if we've emitted an event.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if ('function' === typeof listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Register a new EventListener for the given event.
 *
 * @param {String} event Name of the event.
 * @param {Functon} fn Callback function.
 * @param {Mixed} context The context of the function.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  var listener = new EE(fn, context || this)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Add an EventListener that's only called once.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} context The context of the function.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  var listener = new EE(fn, context || this, true)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Remove event listeners.
 *
 * @param {String} event The event we want to remove.
 * @param {Function} fn The listener that we need to find.
 * @param {Mixed} context Only remove listeners matching this context.
 * @param {Boolean} once Only remove once listeners.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return this;

  var listeners = this._events[evt]
    , events = [];

  if (fn) {
    if (listeners.fn) {
      if (
           listeners.fn !== fn
        || (once && !listeners.once)
        || (context && listeners.context !== context)
      ) {
        events.push(listeners);
      }
    } else {
      for (var i = 0, length = listeners.length; i < length; i++) {
        if (
             listeners[i].fn !== fn
          || (once && !listeners[i].once)
          || (context && listeners[i].context !== context)
        ) {
          events.push(listeners[i]);
        }
      }
    }
  }

  //
  // Reset the array, or remove it completely if we have no more listeners.
  //
  if (events.length) {
    this._events[evt] = events.length === 1 ? events[0] : events;
  } else {
    delete this._events[evt];
  }

  return this;
};

/**
 * Remove all listeners or only the listeners for the specified event.
 *
 * @param {String} event The event want to remove all listeners for.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  if (!this._events) return this;

  if (event) delete this._events[prefix ? prefix + event : event];
  else this._events = prefix ? {} : Object.create(null);

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// This function doesn't apply anymore.
//
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};

//
// Expose the prefix.
//
EventEmitter.prefixed = prefix;

//
// Expose the module.
//
if ('undefined' !== typeof module) {
  module.exports = EventEmitter;
}

},{}]},{},[1]);
