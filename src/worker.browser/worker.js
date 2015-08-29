import EventEmitter from 'eventemitter3';
import slaveCode from './slave.js.txt';

import { getConfig } from '../config';


if (typeof window.Worker !== 'object') {
  throw new Error('Browser does not support web workers!');
}

const slaveCodeDataUri = 'data:text/javascript;charset=utf-8,' + encodeURI(slaveCode);


function prependScriptUrl(scriptUrl) {
  const prefix = getConfig().basepath.web;
  return prefix ? prefix + '/' + scriptUrl : scriptUrl;
}


export default class Worker extends EventEmitter {
  constructor(initialScript = null, importScripts = []) {
    super();

    this.worker = new Worker(slaveCodeDataUri);
    this.setupListeners();

    if (initialScript) {
      this.run(initialScript, importScripts);
    }
  }

  run(toRun, importScripts = []) {
    if (typeof toRun === 'function') {
      this.runMethod(toRun, importScripts);
    } else {
      this.runScripts(toRun, importScripts);
    }
    return this;
  }

  runMethod(method, importScripts) {
    this.worker.postMessage({
      initByMethod : true,
      scripts      : importScripts
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

  setupListeners() {
    this.worker.addEventListener('message', this.emit.bind(this, 'message'));
    this.worker.addEventListener('error', this.emit.bind(this, 'error'));
  }
}
