
import EventEmitter from 'eventemitter3';

export default class Job extends EventEmitter {
  constructor(pool) {
    super();
    this.pool   = pool;
    this.thread = null;

    this.runArgs = [];
    this.sendArgs = [];

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

    this.sendArgs = args;

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

    this.emit('threadChanged');
    return this;
  }

  promise() {
    // Always return a promise
    return new Promise((resolve) => {
      // If the thread isn't set, listen for the threadChanged event
      if (!this.thread) {
        this.once('threadChanged', () => {
          resolve(this.thread.promise());
        });
      } else {
        resolve(this.thread.promise());
      }
    });
  }
}
