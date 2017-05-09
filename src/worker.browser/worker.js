import EventEmitter from 'eventemitter3';
import slaveCodeDataUri from './slave-code-uri';

import { getConfig } from '../config';

if (typeof window.Worker !== 'object' && typeof window.Worker !== 'function') {
  throw new Error('Browser does not support web workers!');
}

function joinPaths (path1, path2) {
  if (!path1 || !path2) {
    return path1 + path2;
  } else if (path1.charAt(path1.length - 1) === '/' || path2.charAt(0) === '/') {
    return path1 + path2;
  } else {
    return path1 + '/' + path2;
  }
}

function prependScriptUrl(scriptUrl) {
  const prefix = getConfig().basepath.web;
  return prefix ? joinPaths(prefix, scriptUrl) : scriptUrl;
}

function argsToArray(argumentsList) {
  return Array.prototype.slice.call(argumentsList);
}

function logError(error) {
  if (error.stack) {
    console.error(error.stack);                                             // eslint-disable-line no-console
  } else if (error.message && error.filename && error.lineno) {
    const fileName = error.filename.match(/^data:text\/javascript/) && error.filename.length > 50
                   ? error.filename.substr(0, 50) + '...'
                   : error.filename;
    console.error(`${error.message} @${fileName}:${error.lineno}`);   // eslint-disable-line no-console
  } else {
    console.error(error);                                                   // eslint-disable-line no-console
  }
}


export default class Worker extends EventEmitter {
  constructor(initialScript = null, importScripts = []) {
    super();

    // used by `run()` to decide if the worker must be re-initialized
    this.currentRunnable = null;
    this.currentImportScripts = [];

    this.initWorker();
    this.worker.addEventListener('message', this.handleMessage.bind(this));
    this.worker.addEventListener('error', this.handleError.bind(this));

    if (initialScript) {
      this.run(initialScript, importScripts);
    }
  }

  initWorker() {
    try {
      this.worker = new window.Worker(slaveCodeDataUri);
    } catch (error) {
      const slaveScriptUrl = getConfig().fallback.slaveScriptUrl;
      if (slaveScriptUrl) {
        // try using the slave script file instead of the data URI
        this.worker = new window.Worker(slaveScriptUrl);
      } else {
        // re-throw
        throw error;
      }
    }
  }

  run(toRun, importScripts = []) {
    if (this.alreadyInitializedToRun(toRun, importScripts)) {
      // don't re-initialize with the new logic if it already has been
      return this;
    }

    if (typeof toRun === 'function') {
      this.runMethod(toRun, importScripts);
    } else {
      this.runScripts(toRun, importScripts);
    }

    this.currentRunnable = toRun;
    this.currentImportScripts = importScripts;

    return this;
  }

  runMethod(method, importScripts) {
    const methodStr = method.toString();
    const args = methodStr.substring(methodStr.indexOf('(') + 1, methodStr.indexOf(')')).split(',');
    const body = methodStr.substring(methodStr.indexOf('{') + 1, methodStr.lastIndexOf('}'));

    this.worker.postMessage({
      initByMethod : true,
      method       : { args, body },
      scripts      : importScripts.map(prependScriptUrl)
    });
  }

  runScripts(script, importScripts) {
    if (!script) { throw new Error('Must pass a function or a script URL to run().'); }

    // attention: array for browser, single script for node
    this.worker.postMessage({
      initByScripts : true,
      scripts       : importScripts.concat([ script ]).map(prependScriptUrl)
    });
  }

  send(param, transferables = []) {
    this.worker.postMessage({
      doRun : true,
      param
    }, transferables);
    return this;
  }

  kill() {
    this.worker.terminate();
    this.emit('exit');
    return this;
  }

  promise() {
    return new Promise((resolve, reject) => {
      let resolved, rejected;
      resolved = (result) => {
        this.removeListener('error', rejected);
        resolve(result);
      };
      rejected = (err) => {
        this.removeListener('message', resolved);
        reject(err);
      };

      this
        .once('message', resolved)
        .once('error', rejected);
    });
  }

  alreadyInitializedToRun(toRun, importScripts) {
    const runnablesMatch = this.currentRunnable === toRun;
    const importScriptsMatch = this.currentImportScripts === importScripts
      || (importScripts.length === 0 && this.currentImportScripts.length === 0);

    return runnablesMatch && importScriptsMatch;
  }

  handleMessage(event) {
    if (event.data.error) {
      this.handleError(event.data.error);
    } else if (event.data.progress) {
      this.handleProgress(event.data.progress);
    } else {
      const responseArgs = argsToArray(event.data.response);
      this.emit('message', ...responseArgs);
      this.emit('done', ...responseArgs);    // this one is just for convenience
    }
  }

  handleProgress(progress) {
    this.emit('progress', progress);
  }

  handleError(error) {
    if (!this.listeners('error', true)) {
      logError(error);
    }

    if (error.preventDefault) {
      error.preventDefault();
    }

    this.emit('error', error);
  }
}
