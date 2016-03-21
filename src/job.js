
import EventEmitter from 'eventemitter3';

export default class Job extends EventEmitter {
  constructor(pool) {
    super();
    this.pool   = pool;
    this.thread = null;

    this.runArgs = [];
    this.clearSendParameter();

    pool.emit('newJob', this);
  }

  run(...args) {
    if (args.length === 0) {
      throw new Error('Cannot call .run() without arguments.');
    }

    this.runArgs = args;
    return this;
  }

  send(...args) {
    if (this.runArgs.length === 0) {
      throw new Error('Cannot .send() before .run().');
    }

    if (this.hasSendParameter()) {
      // do not alter this job, clone it and set send param instead
      return this.clone().clearSendParameter().send(...args);
    }

    this.sendArgs = args;
    this.parameterSet = true;

    this.emit('readyToRun');
    return this;
  }

  executeOn(thread) {
    thread
      .once('message', this.emit.bind(this, 'done'))
      .once('error', this.emit.bind(this, 'error'))
      .run(...this.runArgs)
      .send(...this.sendArgs);

    this.thread = thread;
    return this;
  }

  promise() {
    if (!this.thread) {
      throw new Error('Cannot return promise, since job is not executed.');
    }
    return this.thread.promise();
  }

  clone() {
    const clone = new Job(this.pool);

    if (this.runArgs.length > 0) {
      clone.run(...this.runArgs);
    }
    if (this.parameterSet) {
      clone.send(...this.sendArgs);
    }

    return clone;
  }

  hasSendParameter() {
    return this.parameterSet;
  }

  clearSendParameter() {
    this.parameterSet  = false;
    this.sendArgs = [];
    return this;
  }
}
