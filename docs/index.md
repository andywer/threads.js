---
layout: home
permalink: /
article_header: false
title: Worker threads and thread pools for node.js and the web
# articles:
#   excerpt_type: html
---

<style>
  article a:not(.button) {
    font-weight: inherit;
  }

  section {
    align-items: center;
    display: flex;
    flex-direction: column;
  }
  section h2 {
    border: none;
    font-size: 2.3rem;
    line-height: 100%;
    margin-top: 0;
  }
  .index-features ul {
    font-size: 1.4rem;
    list-style-type: none;
    padding-left: 1.2rem;
  }
  .index-features ul > li {
    margin: 0.2rem 0;
  }
  .index-feature-icon {
    display: inline-block;
    margin-right: 1rem;
    text-align: center;
    width: 1.2rem;
  }

  .card__header {
    color: inherit !important;
    cursor: default !important;
    text-decoration: none !important;
  }
  .card__content h4 {
    font-size: 1.1rem;
  }
  .card__header > .logos {
    color: inherit;
    font-size: 1.2rem;
  }
  .card__header > .logos > i {
    margin: 0 0.1rem;
  }

  .card-flex {
    flex-basis: 90% !important;
  }
  @media (min-width: 600px) {
    .card-flex {
      flex-basis: 46% !important;
    }
  }
  @media (min-width: 800px) {
    .card-flex {
      flex-basis: 28% !important;
    }
  }

  .highlight pre {
    border-radius: 0.4rem;
  }

  .highlight pre.command-prompt {
    color: #f8f8f8;
  }

  .command-prompt:before {
    content: "> ";
    opacity: 0.8;
  }
</style>

<section class="hero" style="position: relative">
  <div class="my-5">
    <h1>threads.js</h1>

    <p>
      Manage worker threads in node.js, web browsers and electron.
    </p>

    <div class="highlighter-rouge my-4">
      <div class="highlight">
        <pre class="command-prompt highlight px-4 py-3">npm install threads</pre>
      </div>
    </div>

    <p class="text-center mt-4">
      <a class="button button--primary button--rounded button--xxl mt-4 mx-2" href="/getting-started">
        Getting started
      </a>
      <a class="button button--secondary button--rounded button--xxl mt-4 mx-2" href="/usage">
        Documentation
      </a>
    </p>
  </div>
</section>

<hr />

<section class="index-features my-5">
  <h2 class="text-center">Transparent API</h2>

  <p class="mt-3 text-center" markdown="1">
    Write code once, run it everywhere.
  </p>

  <div class="d-flex flex-column" markdown="1">
```js
// master.js
import { spawn, Worker } from "threads"

const hashPassword = await spawn(new Worker("./hash"))
const hashed = await hashPassword("Super secret password", "1234")

console.log("Hashed password:", hashed)
```

```js
// hash.js - will be run in worker thread
import sha256 from "js-sha256"
import { expose } from "threads/worker"

expose(function hashPassword(password, salt) {
  return sha256(password + salt)
})
```
  </div>
</section>

<hr />

<section class="index-features my-5">
  <h2 class="text-center">Modern Features</h2>

  <p class="mt-3 text-center" markdown="1">
    Designed for modern day JavaScript and TypeScript code.
  </p>

  <ul class="mt-3">
    <li>
      <span class="index-feature-icon"><i class="fab fa-js-square"></i></span>
      Uses async functions &amp; observables
    </li>
    <li>
      <span class="index-feature-icon"><i class="fas fa-check-square"></i></span>
      Fully statically typed using TypeScript
    </li>
    <li>
      <span class="index-feature-icon"><i class="fas fa-box"></i></span>
      Works great with <a href="https://webpack.js.org/" rel="nofollow noopener" target="_blank">webpack</a>
    </li>
  </ul>
</section>

<hr />

<section class="index-features my-5">
  <h2 class="text-center">Benefits</h2>

  <p class="mt-3 text-center" markdown="1">
    Don't underestimate the difference it can make.
  </p>

  <ul class="mt-3">
    <li>
      <span class="index-feature-icon"><i class="fas fa-forward"></i></span>
      Speed up code by parallel processing
    </li>
    <li>
      <span class="index-feature-icon"><i class="fas fa-list-alt"></i></span>
      Manage bulk task executions with thread pools
    </li>
    <li>
      <span class="index-feature-icon"><i class="fas fa-desktop"></i></span>
      Offload work from main thread for smooth animations
    </li>
  </ul>
</section>

<hr />

<section class="index-features my-5">
  <h2 class="text-center">Supported environments</h2>

  <p class="mt-3 text-center" markdown="1">
    Serves as an abstraction layer for different worker implementations.
  </p>

  <div class="mt-3">
    <div class="grid" style="justify-content: center">
      <div class="card cell m-3 card-flex">
        <div class="card__content text-center">
          <div class="card__header">
            <div class="logos"><i class="fab fa-node-js"></i></div>
          </div>
          <h4>Node.js 12+</h4>
          <p>
            Using native <a href="https://nodejs.org/api/worker_threads.html" rel="nofollow noopener" target="_blank">worker threads</a>
          </p>
        </div>
      </div>
      <div class="card cell m-3 card-flex">
        <div class="card__content text-center">
          <div class="card__header">
            <div class="logos"><i class="fab fa-node-js"></i></div>
          </div>
          <h4>Node.js 8 to 11</h4>
          <p>
            Using <a href="https://github.com/avoidwork/tiny-worker" rel="nofollow noopener" target="_blank">tiny-worker</a>
          </p>
        </div>
      </div>
      <div class="card cell m-3 card-flex">
        <div class="card__content text-center">
          <div class="card__header">
            <div class="logos">
              <i class="fab fa-chrome"></i>
              <i class="fab fa-firefox"></i>
              <i class="fab fa-safari"></i>
              <i class="fab fa-edge"></i>
            </div>
          </div>
          <h4>Web browsers</h4>
          <p>
            Using <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API" rel="nofollow noopener" target="_blank">web workers</a>
          </p>
        </div>
      </div>
      <div class="card cell cell--sm-11 cell--lg-4 m-3">
        <div class="card__content text-center">
          <div class="card__header">
            <div class="logos">
              <i class="fab fa-windows"></i>
              <i class="fab fa-apple"></i>
              <i class="fab fa-linux"></i>
            </div>
          </div>
          <p>
            Tested on all major desktop operating systems
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- TODO: Section -->
  <!-- Link: Repository -->
  <!-- Link: Releases -->
  <!-- Link: Issues -->
<!-- --- -->
