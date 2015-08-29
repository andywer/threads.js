
import config from './config';
import Worker from './worker';

export { config };
export { Worker };    // needed for testing

export function spawn(runnable = null) {
  return new Worker(runnable);
}

// TODO: export Pool
