import EventEmitter from 'eventemitter3';
import Job          from './job';
import defaults     from './defaults';
import { spawn }    from './';

export default class Pool extends EventEmitter {
  constructor(threads, options = {}) {
    super();
    this.threads = Pool.spawn(threads || defaults.pool.size, options);
    this.idleThreads = this.threads.slice();
    this.jobQueue = [];
    this.runArgs = [];
    this.spawnOptions = options;

    this.on('newJob', (job) => this.handleNewJob(job));
    this.on('threadAvailable', () => this.dequeue());
  }

  run(...args) {
    this.runArgs = args;
    return this;
  }

  send(...args) {
    if (!this.runArgs) {
      throw new Error('Pool.send() called without prior Pool.run(). You need to define what to run first.');
    }

    const job = new Job(this);
    return job.run(...this.runArgs).send(...args);
  }

  killAll() {
    this.threads.forEach(thread => {
      thread.kill();
    });
  }

  queueJob(job) {
    job.once('abort', () => this.dropJob(job));  // triggered by job.abort()
    this.jobQueue.push(job);
    this.dequeue();
  }

  dropJob(job) {
    const index = this.jobQueue.indexOf(job);
    if (index !== -1) {
      this.jobQueue.splice(index, 1);
    }
  }

  dequeue() {
    if (this.jobQueue.length === 0 || this.idleThreads.length === 0) {
      return;
    }

    const job = this.jobQueue.shift();
    const thread = this.idleThreads.shift();

    job.removeAllListeners('abort'); // remove previous listener

    job
      .once('done', (...args) => this.handleJobSuccess(thread, job, ...args))
      .once('error', (...args) => this.handleJobError(thread, job, ...args))
      .once('abort', () => this.handleJobAbort(thread, job));

    job.executeOn(thread);
  }

  handleNewJob(job) {
    job.once('readyToRun', () => this.queueJob(job));    // triggered by job.send()
  }

  handleJobSuccess(thread, job, ...responseArgs) {
    this.emit('done', job, ...responseArgs);
    this.handleJobDone(thread, job);
  }

  handleJobError(thread, job, error) {
    this.emit('error', job, error);
    this.handleJobDone(thread, job);
  }

  handleJobDone(thread, job) {
    job.destroy();                    // to prevent memory leak
    this.idleThreads.push(thread);
    this.emit('threadAvailable');

    if (this.idleThreads.length === this.threads.length) {
      // run deferred to give other job.on('done') handlers time to run first
      setTimeout(() => { this.emit('finished'); }, 0);
    }
  }

  handleJobAbort(thread, job) {
    thread.kill();

    const index = this.threads.indexOf(thread);
    const newThread = spawn(null, [], this.spawnOptions);

    this.threads.splice(index, 1, newThread);
    this.handleJobDone(newThread, job);
  }
}

Pool.spawn = (threadCount, options) => {
  const threads = [];

  for (let threadIndex = 0; threadIndex < threadCount; threadIndex++) {
    threads.push(spawn(null, [], options));
  }

  return threads;
};
