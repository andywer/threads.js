import 'native-promise-only';

import config from './config';
import Pool   from './pool';
import Worker from './worker';

export { config, Pool };

export function spawn(runnable = null, importScripts = []) {
  return new Worker(runnable, importScripts);
}

export default {
  config,
  Pool,
  spawn,
  Worker
};
