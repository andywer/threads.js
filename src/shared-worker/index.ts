import getExpose from "../get-expose";
import Implementation from "./implementation";

export { registerSerializer } from "../common";
export { Transfer } from "../transferable";

/** Returns `true` if this code is currently running in a worker. */
export const isWorkerRuntime = Implementation.isWorkerRuntime;

const expose = getExpose(Implementation);

export { expose };
