import 'native-promise-only';

import config   from './config';
import defaults from './defaults';
import Pool     from './pool';
import Worker   from './worker';

export { config, defaults, Pool };

export function spawn(runnable = null, importScripts = []) {
  return new Worker(runnable, importScripts);
}

export default {
  config,
  defaults,
  Pool,
  spawn,
  Worker
};
