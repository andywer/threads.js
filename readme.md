# thread.js

Javascript thread library. Uses web workers when run in browsers and clusters
when run by node.js. Also supports browsers which do not support web workers.

- Convenience API
- For client and server use
- Use different APIs (web worker, shared worker, node cluster) transparently
- Thread pools
- example use cases
- ES6, but backwards-compatible


## How To

### Basic use

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

### Generic worker

Don't provide a worker script, but spawn a generic worker and provide him a
function to execute. This is especially useful for non-complex thread code.

```javascript
import { spawn } from 'thread.js';
// ES5 syntax: var spawn = require('thread.js').spawn;

const thread = spawn();
// spawn a SharedWorker: `spawn({ shared: true })`

thread
  .run(function(param, done) {
    // remember that this function will be executed in the thread's context,
    // so you cannot reference any value of the surrounding code
    done(param, param + 1);
  })
  .send(1)
  .send(2)
  .on('message', function(value, valuePlusOne) {
    console.log(`${value} + 1 = ${valuePlusOne}`);
  });
```

### Thread Pool

You can also create a thread pool that spawns a fixed no. of workers. Pass jobs
to the thread pool which it will queue and pass to the next idle worker.

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

### Streaming

You can also spawn a thread for streaming purposes. The following example shows
a very simple use case where you keep feeding numbers to the background task
and it will return the minimum and maximum of all values you ever passed.

```javascript
thread
  .run(function minmax(int, done) {
    if (typeof this.min === 'undefined') {
      this.min = int;
      this.max = int;
    } else {
      this.min = Math.min(this.min, int);
      this.max = Math.max(this.max, int);
    }
    done({ min : this.min, max : this.max }});
  })
  .send(2)
  .send(3)
  .send(4)
  .send(1)
  .send(5)
  .on('message', function(minmax) {
    console.log('min:', minmax.min, ', max:', minmax.max);
  })
  .on('done', function() {
    thread.kill();
  });
```

### Import scripts and transferable objects

You can also use dependencies in the spawned thread and use transferable objects
to improve performance when passing large buffers (in browser).
See [Transferable Objects: Lightning Fast!](http://updates.html5rocks.com/2011/12/Transferable-Objects-Lightning-Fast).

```javascript
const largeArrayBuffer = new Uint8Array(1024*1024*32); // 32MB
const data = { label : 'huge thing', buffer: largeArrayBuffer.buffer };

thread
  .run(function(param, done) {
    // do something cool with this.axios
    done();
  }, {
    // dependencies; resolved using node's require() or the web workers importScript()
    // the key will be used as key on worker's `this` object
    // the value is used similar to require() or es6 import
    axios : 'axios'
  })
  // pass the buffers to transfer into thread context as 2nd parameter to send()
  .send(data, [ largeArrayBuffer.buffer ]);
```

## API

You can find the API documentation in the [wiki](https://github.com/andywer/thread.js/wiki).


## License

This library is published under the MIT license. See [LICENSE](https://raw.githubusercontent.com/andywer/thread.js/master/LICENSE) for details.
