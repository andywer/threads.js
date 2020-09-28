import { expose } from "../../src/worker"

export type MapWorker = (input: number[], mapper: (source: number) => number | Promise<number>) => number[]

expose(function map(input: number[], mapper: (source: number) => number) {
  return Promise.all(input.map(mapper))
})
