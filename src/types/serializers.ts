import { MessageRelay } from "./common"

type JsonSerializablePrimitive = string | number | boolean | null

type JsonSerializableObject = {
  [key: string]:
  | JsonSerializablePrimitive
  | JsonSerializablePrimitive[]
  | JsonSerializableObject
  | JsonSerializableObject[]
  | undefined
}

export type JsonSerializable =
  | JsonSerializablePrimitive
  | JsonSerializablePrimitive[]
  | JsonSerializableObject
  | JsonSerializableObject[]

export interface Serializer<Msg = JsonSerializable, Input = any, Deserialized = Input> {
  deserialize(message: Msg, sender: MessageRelay | null): Deserialized
  serialize(input: Input): Msg
}

export interface SerializerImplementation<Msg = JsonSerializable, Input = any> {
  deserialize(message: Msg, defaultDeserialize: ((msg: Msg) => Input)): Input
  serialize(input: Input, defaultSerialize: ((inp: Input) => Msg)): Msg
}

export interface SerializedCallback {
  __callback_marker: "$$callback"
  fid: number
}

export interface SerializedError {
  __error_marker: "$$error"
  message: string
  name: string
  stack?: string
}

export interface SerializedIterator {
  __iterator_marker: "$$iterator"
  next_fid: number
}
