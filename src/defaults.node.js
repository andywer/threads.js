import { cpus } from 'os';

export default {
  pool : {
    size : cpus().length
  }
};
