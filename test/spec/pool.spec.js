import async              from 'async';
import expect             from 'expect.js';
import EventEmitter       from 'eventemitter3';
import { Pool, defaults } from '../../lib/';


let spawnedFakeWorkers = 0;

class FakeWorker extends EventEmitter {
  constructor() {
    super();
    spawnedFakeWorkers++;
  }

  run(runnable, importScripts = []) {
    this.runnable = runnable;
    this.importScripts = importScripts;
    return this;
  }

  send(parameter, transferables = []) {
    this.parameter = parameter;
    this.transferables = transferables;

    setTimeout(() => {
      if (parameter.error) {
        this.emit('error', parameter.error);
      } else {
        this.emit('message', parameter);
      }
    }, 0);
    return this;
  }

  kill() {
    this.emit('exit');
    return this;
  }
}

function noop() { return this; }

function doTimes(callback, times) {
  const returns = [];

  for (let index = 0; index < times; index++) {
    returns.push(callback());
  }

  return returns;
}


describe('Pool', () => {

  const origSpawn = Pool.spawn;
  const origDefaultSize = defaults.pool.size;
  const fixedDefaultSize = 3;

  before(() => {
    Pool.spawn = (threadCount) => {
      return doTimes(() => new FakeWorker(), threadCount);
    };
    defaults.pool.size = fixedDefaultSize;
  });

  beforeEach(() => {
    spawnedFakeWorkers = 0;
  });

  after(() => {
    Pool.spawn = origSpawn;
    defaults.pool.size = origDefaultSize;
  });


  it('can be created (w/o arguments)', () => {
    const pool = new Pool();

    expect(pool.threads.length).to.equal(fixedDefaultSize);
    expect(pool.idleThreads).to.eql(pool.threads);
    expect(spawnedFakeWorkers).to.equal(fixedDefaultSize);
  });

  it('can be created with arguments', () => {
    const pool = new Pool(5);

    expect(pool.threads.length).to.equal(5);
    expect(pool.idleThreads).to.eql(pool.threads);
    expect(spawnedFakeWorkers).to.equal(5);
  });

  it('can kill', (done) => {
    const pool = new Pool(5);
    let killedThreads = 0;

    pool.threads.forEach(thread => {
      thread.on('exit', () => {
        killedThreads++;
      });
    });

    pool.killAll();

    setTimeout(() => {
      expect(killedThreads).to.equal(5);
      done();
    }, 20);
  });

  it('can run jobs', (done) => {
    const pool = new Pool();
    let calledJobA = 0, calledJobB = 0;

    const jobA = pool
      .run(noop)
      .send({ foo : 1 });
    const jobB = pool
      .run(noop)
      .send({ foo : 2 });

    pool
      .on('done', (job, message) => {
        switch(job) {
          case jobA:
            calledJobA++;
            expect(message).to.eql({ foo : 1 });
            break;
          case jobB:
            calledJobB++;
            expect(message).to.eql({ foo : 2 });
            break;
          default:
            throw new Error('"message" event for unknown job.');
        }
      })
      .on('finished', () => {
        expect(calledJobA).to.equal(1);
        expect(calledJobB).to.equal(1);
        done();
      });
  });

  it('can handle errors', (done) => {
    let doneHandled = false, errorHandled = false;

    const pool = new Pool();

    const jobA = pool
      .run(noop)
      .send({ foo : 'bar' });
    const jobB = pool
      .run(noop)
      .send({ error : new Error('Something went wrong.') });

    pool
      .on('done', (job, message) => {
        doneHandled = true;
        expect(job).to.equal(jobA);
        expect(message).to.eql({ foo : 'bar' });
      })
      .on('error', (job, error) => {
        errorHandled = true;
        expect(job).to.equal(jobB);
        expect(error.message).to.eql('Something went wrong.');
      })
      .on('finished', () => {
        expect(doneHandled).to.equal(true);
        expect(errorHandled).to.equal(true);
        done();
      });
  });

  it('can queue jobs', (done) => {
    let calledJobA = 0, calledJobB = 0, calledJobC = 0;
    let calledJobD = 0, calledJobE = 0;
    const pool = new Pool(2);

    const part1 = (partDone) => {
      pool
        .run(noop)
        .send({ foo : 1 })
        .on('done', () => { calledJobA++; });
      pool
        .run(noop)
        .send({ foo : 2 })
        .on('done', () => { calledJobB++; });
      pool
        .run(noop)
        .send({ foo : 3 })
        .on('done', () => { calledJobC++; });

      pool.once('finished', () => {
        expect(calledJobA).to.equal(1);
        expect(calledJobB).to.equal(1);
        expect(calledJobC).to.equal(1);
        partDone();
      });
    };

    const part2 = (partDone) => {

      pool
        .run(noop)
        .send({ error : new Error('Will the next job still be handled correctly?') })
        .on('error', () => { calledJobD++; });

      pool
        .run(noop)
        .send({ foo : 4 })
        .on('done', () => { calledJobE++; });

      pool.once('finished', () => {
        // expectation: previous handlers have not been triggered again
        expect(calledJobA).to.equal(1);
        expect(calledJobB).to.equal(1);
        expect(calledJobC).to.equal(1);

        expect(calledJobD).to.equal(1);
        expect(calledJobE).to.equal(1);
        partDone();
      });
    };

    async.series([
      part1, part2
    ], done);
  });

  it('can run a lot of jobs', (done) => {
    const pool = new Pool(3);
    let calledJob = 0;

    function onDone () {
      calledJob++;
    }

    for (let jobIndex = 0; jobIndex < 50; jobIndex++) {
      pool
        .run(noop)
        .send({ jobIndex })
        .on('done', onDone);
    }

    pool.once('finished', () => {
      expect(calledJob).to.equal(50);
      done();
    });
  });

});
