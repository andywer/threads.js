import async  from 'async';
import expect from 'expect.js';
import sinon  from 'sinon';
import { config, spawn, Worker } from '../../';


const env = typeof window === 'object' ? 'browser' : 'node';

function echoThread(param, done) {
  done(param);
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

  it('can run script (set using spawn())', (done) => {
    const worker = spawn('abc-sender.js');
    canSendAndReceive(worker, null, 'abc', done);
  });

  it('can run script (set using .run())', (done) => {
    const worker = spawn(echoThread);
    canSendAndReceiveEcho(worker, done);
  });

  it('can pass more than one argument as response', (done) => {
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

    worker.on('error', (error) => {
      expect(error.message).to.match(/^(Uncaught Error: )?Test message$/);
      done();
    });
    worker.send();
  });


  if (env === 'node') {

    it('thread code can use setTimeout, setInterval', (done) => {
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

    it('can importScripts()', (done) => {
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

    // TODO: test transferables

  }

});
