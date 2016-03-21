import expect       from 'expect.js';
import sinon        from 'sinon';
import EventEmitter from 'eventemitter3';
import Job          from '../../lib/job';


const fakeThreadPromise = new Promise((resolve) => {
  setTimeout(() => {
    resolve(100);
  });
});

function noop() {
  return this;
}

function createFakeThread(response) {
  const thread = new EventEmitter();

  thread.run = noop;
  thread.promise = () => fakeThreadPromise;

  if (response.error) {
    thread.send = function() {
      thread.emit('error', response.error);
    };
  } else {
    thread.send = function() {
      thread.emit('message', ...response.response);
    };
  }

  ['on', 'once', 'emit', 'run', 'send']
    .forEach((methodName) => { sinon.spy(thread, methodName); });

  return thread;
}


describe('Job', () => {
  let pool;

  beforeEach(() => {
    // fake pool
    pool = new EventEmitter();
    sinon.spy(pool, 'emit');
  });

  it('can be created', () => {
    const job = new Job(pool);

    expect(job.sendArgs).to.eql([]);
    sinon.assert.calledOnce(pool.emit);
    sinon.assert.calledWith(pool.emit, 'newJob', job);
  });

  it('throws on .run() without arguments', () => {
    const job = new Job(pool);

    expect(() => { job.run(); }).to.throwError(/Cannot call \.run\(\) without arguments/);
  });

  it('throws on .send() before .run()', () => {
    const job = new Job(pool);

    expect(() => { job.send(); }).to.throwError(/Cannot \.send\(\) before \.run\(\)/);
  });

  it('triggers readyToRun event on .send()', () => {
    const job = new Job(pool);
    sinon.spy(job, 'emit');

    job.run(noop);
    sinon.assert.neverCalledWith(job.emit, 'readyToRun');
    job.send();
    sinon.assert.calledWith(job.emit, 'readyToRun');
  });

  it('can be executed', () => {
    const thread = {
      once : noop,
      run  : noop,
      send : noop
    };
    const mock = sinon.mock(thread);

    const job = new Job(pool);
    const runnable      = noop;
    const importScripts = [];
    const param         = 'some data';
    const transferables = [];

    mock.expects('run').once().withArgs(runnable, importScripts).returnsThis();
    mock.expects('send').once().withArgs(param, transferables).returnsThis();

    job
      .run(runnable, importScripts)
      .send(param, transferables)
      .executeOn(thread);

    mock.verify();
  });

  it('triggers done event', () => {
    const thread = createFakeThread({
      response : [ { foo: 'bar' }, 'more data' ]
    });

    const job = new Job(pool);
    sinon.spy(job, 'emit');

    job
      .run(noop)
      .send()
      .executeOn(thread);

    sinon.assert.calledWith(job.emit, 'done', { foo: 'bar' }, 'more data');
  });

  it('triggers error event', () => {
    const error = new Error('Epic fail');
    const thread = createFakeThread({
      error : error
    });

    const job = new Job(pool);
    sinon.spy(job, 'emit');

    job
      .run(noop)
      .send()
      .executeOn(thread);

    sinon.assert.calledWith(job.emit, 'error', error);
  });

  it('proxies the promise', (done) => {
    const job = new Job(pool);
    const thread = createFakeThread({
      response : [ 'foo bar' ]
    });

    const promise = job
      .run(noop)
      .send()
      .executeOn(thread)
      .promise();

    Promise
    .all([promise, fakeThreadPromise])
    .then((results) => {
      expect(results[0]).to.equal(results[1]);
      done();
    });
  });

  it('Creates a promise even if there is no thread', () => {
    const job = new Job(pool);

    job
      .run(noop)
      .send();

    expect(job.promise() instanceof Promise).to.equal(true);
  });

});
