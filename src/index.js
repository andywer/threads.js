
import Worker from './worker';

export function spawn(url = null) {
  // TODO: GenericWorker if url === null

  return new Worker();
}

// TODO: export Pool
