
import config from './config';
import Worker from './worker';

export { config };

export function spawn(runnable = null) {
  return new Worker(runnable);
}

export default {
  config,
  spawn,
  Worker
};
