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
    this.lastCreatedJob = null;

    this.on('newJob', this.handleNewJob.bind(this));
  }

  run(...args) {
    return (new Job(this)).run(...args);
  }

  send(...args) {
    if (!this.lastCreatedJob) {
      throw new Error('Pool.send() called without prior Pool.run(). You need to define what to run first.');
    }

    // this will not alter the last job, but rather clone it and set this params on the new job
    return this.lastCreatedJob.send(...args);
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
      .on('done', this.handleJobSuccess.bind(this, thread, job))
      .on('error', this.handleJobError.bind(this, thread, job));

    job.executeOn(thread);
  }

  handleNewJob(job) {
    this.lastCreatedJob = job;
    job.on('readyToRun', this.queueJob.bind(this, job));    // triggered by job.send()
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
    this.dequeue();

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
