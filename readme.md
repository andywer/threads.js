# thread.js

Javascript thread library. Uses web workers when run in browsers and clusters
when run by node.js. Also supports browsers which do not support web workers.

- Convenience API
- For client and server use
- Use different APIs (web worker, shared worker, node cluster) transparently
- Thread pools
- example use cases
- ES6, but backwards-compatible

-> TODO: event emitter + promise api


## Sample use

```javascript
import { spawn } from 'thread.js';
// ES5 syntax: var spawn = require('thread.js').spawn;

const thread = spawn('/path/to/worker.js');

thread
  .send({ hello : 'world' })
  .on('message', function(message) {
    console.log('Worker sent:', message);
  })
  .on('error', function(error) {
    console.error('Worker errored:', error);
  })
  .on('exit', function() {
    console.log('Worker is terminated.');
  });

setTimeout(function() {
  thread.kill();
}, 1000);
```


```javascript
import { spawn } from 'thread.js';
// ES5 syntax: var spawn = require('thread.js').spawn;

const thread = spawn();
// spawn a SharedWorker: `spawn({ shared: true })`

thread
  .run(function(param, done) {
    done(param, param + 1);
  })
  .send(1)
  .send(2)
  .on('message', function(value, valuePlusOne) {
    console.log(`${value} + 1 = ${valuePlusOne}`);
  });
```


```javascript
import { Pool } from 'thread.js';
// ES5 syntax: var Pool = require('thread.js').Pool;

const pool = new Pool();
const jobA = pool.run('/path/to/worker').send({ do : 'something' });
const jobB = pool.run(
  function(string, done) {
    const hash = md5(string);
    done(hash);
  }, {
    // dependencies; resolved using node's require() or the web workers importScript()
    md5 : 'js-md5'
  }
).send('Hash this string!');

jobA
  .on('done', function(message) {
    console.log('Job A done:', message);
  })
  .on('error', function(error) {
    console.error('Job A errored:', error);
  });

pool
  .on('done', function(job, message) {
    console.log('Job done:', job);
  })
  .on('error', function(job, error) {
    console.error('Job errored:', job);
  })
  .on('spawn', function(worker, job) {
    console.log('Thread pool spawned a new worker:', worker);
  })
  .on('kill', function(worker) {
    console.log('Thread pool killed a worker:', worker);
  })
  .on('finished', function() {
    console.log('Everything done, shutting down the thread pool.');
    pool.destroy();
  })
  .on('destroy', function() {
    console.log('Thread pool destroyed.');
  });
```
