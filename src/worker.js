/*
 * This file is only a stub to make './worker' resolve the './worker.node/worker' module.
 * Loading the browser worker into the browser bundle is done in the gulpfile by
 * configuring a browserify override.
 */

import Worker from './worker.node/worker';

export default Worker;
