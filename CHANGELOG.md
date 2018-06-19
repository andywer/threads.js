# threads.js - Changelog

## 0.12.0

- Fix UMD bundling (#84)

## 0.11.0

- Implement job abortion (#78, credits to @Liu233w)

## 0.10.1

- Fix issue with Common JS detection in imported web worker scripts (#72, credits to @Keyholder)

## 0.10.0

- Make threads debuggable / inspectable by auto-incrementing debugger ports (#68, credits to @scinos)

## 0.9.0

- Add option parameter to Pool for passing arguments to worker processes [#66](https://github.com/andywer/threads.js/pull/66), credits to https://github.com/ryanchristopherwong8

## 0.8.1

- Bug fix: Some outdated transpiled files were published as `v0.8.0`

## 0.8.0

- Support for async thread functions
- Job class now emits 'progress' events [#56](https://github.com/andywer/threads.js/pull/56), credits to https://github.com/mmcardle

## 0.7.3

- Trigger worker error event on unhandled promise rejection in worker [#49](https://github.com/andywer/threads.js/issues/49)
- Merged lost commits stuck in the `develop` branch [#51](https://github.com/andywer/threads.js/pull/51)

## 0.7.2

- Fixes another memory leak. Credit goes to https://github.com/ChiperSoft
- Depedencies have been updated. threads.js will cannot be built and tested anymore on node 0.12. Node >= 4.0 is from now on required. The lib will still work on Node 0.12, though.
- The `lib/` directory and the transpiled unit test files are now gitignored. `lib/` will of course still be published to npm.

## 0.7.1

- `Pool.prototype.run()` now accepts more than one parameter. See [#31](https://github.com/andywer/threads.js/pull/31).
- Credit goes to https://github.com/DatenMetzgerX

## 0.7.0

- Fixes a critical issue that prevented thread pools from running all jobs.
- Also brings some major performance improvements for browser (web worker) - based setups.

## 0.6.1

- Added alias for threads: Event `done` as alias for `message`. Updated README example code.
- Credit goes to https://github.com/andrakis

## 0.6.0

- Fixes promise and async issues. `Job.clone()` has been dropped.
- Credit goes to https://github.com/maysale01
