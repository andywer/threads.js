import EventEmitter from 'eventemitter3';
import Job          from './job';
import defaults     from './defaults';
import { spawn }    from './';

export default class Pool extends EventEmitter {
  constructor(threads) {
    super();
    this.threads = Pool.spawn(threads || defaults.pool.size);
    this.idleThreads = this.threads.slice();
    this.jobQueue = [];
    this.runArgs = [];

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

    let job = new Job(this);
    job.run(...this.runArgs);
    return job.send(...args);
  }

  killAll() {
    this.threads.forEach(thread => {
      thread.kill();
    });
  }

  queueJob(job) {
    this.jobQueue.push(job);
    this.dequeue();
  }

  dequeue() {
    if (this.jobQueue.length === 0 || this.idleThreads.length === 0) {
      return;
    }

    const job = this.jobQueue.shift();
    const thread = this.idleThreads.shift();

    job
      .once('done', (...args) => this.handleJobSuccess(thread, job, ...args))
      .once('error', (...args) => this.handleJobError(thread, job, ...args));

    job.executeOn(thread);
  }

  handleNewJob(job) {
    this.lastCreatedJob = job;
    job.once('readyToRun', () => this.queueJob(job));    // triggered by job.send()
  }

  handleJobSuccess(thread, job, ...responseArgs) {
    this.emit('done', job, ...responseArgs);
    this.handleJobDone(thread);
  }

  handleJobError(thread, job, error) {
    this.emit('error', job, error);
    this.handleJobDone(thread);
  }

  handleJobDone(thread) {
    this.idleThreads.push(thread);
    this.emit('threadAvailable');

    if (this.idleThreads.length === this.threads.length) {
      // run deferred to give other job.on('done') handlers time to run first
      setTimeout(() => { this.emit('finished'); }, 0);
    }
  }
}

Pool.spawn = (threadCount) => {
  const threads = [];

  for (let threadIndex = 0; threadIndex < threadCount; threadIndex++) {
    threads.push(spawn());
  }

  return threads;
};
