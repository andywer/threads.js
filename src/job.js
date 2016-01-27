
import EventEmitter from 'eventemitter3';

export default class Job extends EventEmitter {
  constructor(pool) {
    super();
    this.pool   = pool;
    this.thread = null;

    this.promiseBoundToThread = false;
    this.promiseControlMethods = {};
    this.jobPromise = new Promise((resolve, reject) => {
      this.promiseControlMethods.resolve = resolve;
      this.promiseControlMethods.reject = reject;
    });

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

    if (!this.promiseBoundToThread) {
      this.bindPromiseTo(thread.promise());
    }

    this.thread = thread;
    return this;
  }

  bindPromiseTo(anotherPromise) {
    anotherPromise
      .then(result => {
        this.promiseControlMethods.resolve(result);
        return result;
      })
      .catch((...errors) => {
        this.promiseControlMethods.reject(...errors);
      });

    this.promiseBoundToThread = true;
  }

  promise() {
    return this.jobPromise;
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
