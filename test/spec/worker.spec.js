import async  from 'async';
import expect from 'expect.js';
import sinon  from 'sinon';
import Worker from '../../lib/worker';
import { config, spawn } from '../../';


const env = typeof window === 'object' ? 'browser' : 'node';

function echoThread(param, done) {
  done(param);
}

function progressThread(param, done, progress) {
  progress(0.3);
  progress(0.6);
  done();
}

function canSendAndReceive(worker, dataToSend, expectToRecv, done) {
  worker
  .once('message', (data) => {
    expect(data).to.eql(expectToRecv);
    done();
  })
  .send(dataToSend);
}

function canSendAndReceiveEcho(worker, done) {
  const testData = { foo: 'bar' };
  canSendAndReceive(worker, testData, testData, done);
}

function expectEqualBuffers(buffer1, buffer2) {
  expect(buffer2.byteLength).to.equal(buffer1.byteLength);

  for (let index = 0; index < buffer1.byteLength; index++) {
    expect(buffer2[ index ]).to.equal(buffer1[ index ]);
  }
}


describe('Worker', () => {

  before(() => {
    sinon
      .stub(config, 'get')
      .returns({
        basepath : {
          node : __dirname + '/../thread-scripts',
          web  : 'http://localhost:9876/base/test/thread-scripts'
        }
      });
  });


  it('can be spawned', () => {
    const worker = spawn();

    expect(worker).to.be.a('object');
    expect(worker).to.be.a(Worker);
  });

  it('can be killed', done => {
    let spy;
    const worker = spawn();

    // the browser worker owns a worker, the node worker owns a slave
    if (env === 'browser') {
      spy = sinon.spy(worker.worker, 'terminate');
    } else {
      spy = sinon.spy(worker.slave, 'kill');
    }

    worker.on('exit', () => {
      expect(spy.calledOnce).to.be.ok();
      done();
    });
    worker.kill();
  });

  it('can run method (set using spawn())', done => {
    const worker = spawn(echoThread);
    canSendAndReceiveEcho(worker, done);
  });

  it('can run method (set using .run())', done => {
    const worker = spawn().run(echoThread);
    canSendAndReceiveEcho(worker, done);
  });

  it('can run script (set using spawn())', done => {
    const worker = spawn('abc-sender.js');
    canSendAndReceive(worker, null, 'abc', done);
  });

  it('can run script (set using .run())', done => {
    const worker = spawn(echoThread);
    canSendAndReceiveEcho(worker, done);
  });

  it('can pass more than one argument as response', done => {
    const worker = spawn((input, threadDone) => { threadDone('a', 'b', 'c'); });
    worker
      .send()
      .on('message', (a, b, c) => {
        expect(a).to.eql('a');
        expect(b).to.eql('b');
        expect(c).to.eql('c');
        worker.kill();
        done();
      });
  });

  it('can reset thread code', done => {
    const worker = spawn();

    // .run(code), .send(data), .run(script), .send(data), .run(code), .send(data)
    async.series([
      (stepDone) => {
        canSendAndReceiveEcho(worker.run(echoThread), stepDone);
      },
      (stepDone) => {
        canSendAndReceive(worker.run('abc-sender.js'), null, 'abc', stepDone);
      },
      (stepDone) => {
        canSendAndReceiveEcho(worker.run(echoThread), stepDone);
      }
    ], done);
  });

  it('can emit error', done => {
    const worker = spawn(() => {
      throw new Error('Test message');
    });

    worker.on('error', error => {
      expect(error.message).to.match(/^((Uncaught )?Error: )?Test message$/);
      done();
    });
    worker.send();
  });

  it('can promise and resolve', done => {
    const promise = spawn(echoThread)
      .send('foo bar')
      .promise();

    expect(promise).to.be.a(Promise);

    promise.then(response => {
      expect(response).to.eql('foo bar');
      done();
    });
  });

  it('can promise and reject', done => {
    const worker = spawn(() => {
      throw new Error('I fail');
    });
    const promise = worker
      .send()
      .promise();

    promise.catch(error => {
      expect(error.message).to.match(/^((Uncaught )?Error: )?I fail$/);
      done();
    });
  });

  it('can update progress', done => {
    const progressUpdates = [];
    const worker = spawn(progressThread);

    worker.on('progress', progress => {
      progressUpdates.push(progress);
    });
    worker.send();

    worker.on('message', () => {
      expect(progressUpdates).to.eql([ 0.3, 0.6 ]);
      done();
    });
  });

  it('does also emit "done" event', done => {
    const progressUpdates = [];
    const worker = spawn(progressThread);

    worker.on('progress', progress => {
      progressUpdates.push(progress);
    });
    worker.send();

    worker.on('done', () => {
      expect(progressUpdates).to.eql([ 0.3, 0.6 ]);
      done();
    });
  });


  if (env === 'node') {

    it('thread code can use setTimeout, setInterval', done => {
      let messageCount = 0;

      const worker = spawn()
        .run((param, threadDone) => {
          setTimeout(() => {
            setInterval(() => { threadDone(true); }, 10);
          }, 20);
        })
        .send()
        .on('message', () => {
          messageCount++;
          if (messageCount === 3) {
            worker.kill();
            done();
          }
        });
    });

  }


  if (env === 'browser') {

    it('can importScripts()', done => {
      const worker = spawn()
        .run(function(input, threadDone) {
          this.importedEcho(input, threadDone);
        }, [ 'import-me.js' ])
        .send('abc')
        .on('message', (response) => {
          expect(response).to.eql('abc');
          worker.kill();
          done();
        });
    });

    it('can use transferables', function(done) {
      // for some reason this test consumes extra-ordinarily much time when run on travis ci
      this.timeout(6000);

      const arrayBuffer = new Uint8Array(1024 * 2);       // 2 KB
      const arrayBufferClone = new Uint8Array(1024 * 2);
      // need to clone, because referencing arrayBuffer will not work after .send()

      for (let index = 0; index < arrayBuffer.byteLength; index++) {
        arrayBufferClone[ index ] = arrayBuffer[ index ];
      }

      const worker = spawn().
        run((input, threadDone) => {
          threadDone.transfer(input, [ input.data.buffer ]);
        })
        .send({ data: arrayBuffer }, [ arrayBuffer.buffer ])
        .on('message', (response) => {
          expectEqualBuffers(arrayBufferClone, response.data);

          worker.kill();
          done();
        });
    });

  }

});
