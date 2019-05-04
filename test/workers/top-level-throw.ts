import "ts-node/register"
import { expose } from "../../src/worker"

throw Error("Top-level worker error")
expose(() => true)
