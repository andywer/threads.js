import DebugLogger from "debug"
import { createProxyFunction } from "../common/call-proxy"
import { Callback, RemoteCallback } from "../common/callbacks"
import { MessageRelay } from "../types/common"
import { SerializedIterator, Serializer } from "../types/serializers"

const debug = DebugLogger("threads:callback:messages")

export const DefaultIteratorSerializer = (rootSerializer: Serializer): Serializer<SerializedIterator, Iterator<any> | AsyncIterator<any>, AsyncIterator<any>> => ({
  deserialize(message: SerializedIterator, origin: MessageRelay): AsyncIterator<any> & AsyncIterable<any> {
    const remoteNext = createProxyFunction<[], IteratorResult<any>>(origin, rootSerializer, message.next_fid, debug)
    const remoteCallback = RemoteCallback<() => Promise<IteratorResult<any>>>(remoteNext)

    const next = async () => {
      const result = await remoteCallback()
      if (result.done) {
        remoteCallback.release()
      }
      return result
    }

    const asyncIterator = {
      [Symbol.asyncIterator]: () => asyncIterator,
      next
    }
    return asyncIterator
  },
  serialize(iter: Iterator<any> | AsyncIterator<any>): SerializedIterator {
    const next = Callback(async () => {
      const result = await iter.next()
      if (result.done) {
        next.release()
      }
      return result
    })
    return {
      __iterator_marker: "$$iterator",
      next_fid: next.id
    }
  }
})

export const isIterator = (thing: any): thing is Iterator<any> | AsyncIterator<any> =>
  thing && typeof thing === "object" && (
    typeof thing.next === "function" ||
    typeof (thing as AsyncIterable<unknown>)[Symbol.asyncIterator] === "function"
  )

export const isSerializedIterator = (thing: any): thing is SerializedIterator =>
  thing && typeof thing === "object" && "__iterator_marker" in thing && thing.__iterator_marker === "$$iterator"
