import DebugLogger from "debug"
import { createProxyFunction } from "../common/call-proxy"
import { Callback, RemoteCallback } from "../common/callbacks"
import { MessageRelay } from "../types/common"
import { SerializedCallback, Serializer } from "../types/serializers"

const debug = DebugLogger("threads:callback:messages")

export const DefaultCallbackSerializer = (rootSerializer: Serializer): Serializer<SerializedCallback, Callback<any>> => ({
  deserialize(message: SerializedCallback, origin: MessageRelay): Callback<any> {
    const proxy = createProxyFunction(origin, rootSerializer, message.fid, debug)
    return RemoteCallback(proxy)
  },
  serialize(callback: Callback<any>): SerializedCallback {
    return {
      __callback_marker: "$$callback",
      fid: callback.id
    }
  }
})

export const isSerializedCallback = (thing: any): thing is SerializedCallback =>
  thing && typeof thing === "object" && "__callback_marker" in thing && thing.__callback_marker === "$$callback"
