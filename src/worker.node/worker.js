import child        from 'child_process';
import path         from 'path';
import EventEmitter from 'eventemitter3';

import { getConfig } from '../config';

// Mutable variable with the last port used for inspect/inspect-brk.
// This value is shared among all workers.
let lastPort = 0;

// Port used by Node.JS when there is no port specified. See
// https://nodejs.org/en/docs/inspector/#command-line-options
const DEFAULT_PORT = 9229;
const buildExecArgv = () => process.execArgv.map(arg => {
  const matches = arg.match(/^(--inspect(?:-brk)?)(?:=(\d+))?/);
  if (!matches) return arg;

  const command = matches[1];
  if (lastPort === 0) lastPort = Number(matches[2]) || 9229;
  lastPort++;
  return `${command}=${lastPort}`
});

// This function will reset the counter of ports used for inspect/inspect-brk.
// Used for testing.
export const resetPortCounter = () => {
  lastPort = 0;
}

export default class Worker extends EventEmitter {
  constructor(initialRunnable, importScripts = [], options = {}) {
    // `importScripts` cannot be consumed, it's just there to keep the API compatible to the browser worker
    super();

    this.slave = child.fork(path.join(__dirname, 'slave.js'), [], Object.assign(
      { execArgv: buildExecArgv() },
      options
    ));
    this.slave.on('message', this.handleMessage.bind(this));
    this.slave.on('error', this.handleError.bind(this));
    this.slave.on('exit', this.emit.bind(this, 'exit'));

    if (initialRunnable) {
      this.run(initialRunnable);
    }
  }

  run(toRun) {
    if (typeof toRun === 'function') {
      this.runMethod(toRun);
    } else {
      this.runScript(toRun);
    }
    return this;
  }

  runMethod(method) {
    this.slave.send({
      initByMethod : true,
      method       : method.toString()
    });
  }

  runScript(script) {
    if (!script) { throw new Error('Must pass a function or a script path to run().'); }

    const prefixedScriptPath = path.join(getConfig().basepath.node, script);

    // attention: single script for node, array for browser
    this.slave.send({
      initByScript : true,
      script       : path.resolve(prefixedScriptPath)
    });
  }

  send(param) {
    this.slave.send({
      doRun : true,
      param
    });
    return this;
  }

  kill() {
    this.slave.kill();
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

  handleMessage(message) {
    if (message.error) {
      const error = new Error(message.error.message);
      error.stack = message.error.stack;

      this.handleError(error);
    } else if (message.progress) {
      this.handleProgress(message.progress);
    } else {
      this.emit('message', ...message.response);
      this.emit('done', ...message.response);    // this one is just for convenience
    }
  }

  handleProgress(progress) {
    this.emit('progress', progress);
  }

  handleError(error) {
    if (!this.listeners('error', true)) {
      console.error(error.stack || error);       // eslint-disable-line no-console
    }
    this.emit('error', error);
  }
}
