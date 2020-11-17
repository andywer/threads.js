import { SerializedError } from "./types/messages"

export interface Serializer<Msg = JsonSerializable, Input = any> {
  deserialize(message: Msg): Input
  serialize(input: Input): Msg
}

export interface SerializerImplementation<Msg = JsonSerializable, Input = any> {
  deserialize(message: Msg, defaultDeserialize: ((msg: Msg) => Input)): Input
  serialize(input: Input, defaultSerialize: ((inp: Input) => Msg)): Msg
}

export function extendSerializer<MessageType, InputType = any>(
  extend: Serializer<MessageType, InputType>,
  implementation: SerializerImplementation<MessageType, InputType>
): Serializer<MessageType, InputType> {
  const fallbackDeserializer = extend.deserialize.bind(extend)
  const fallbackSerializer = extend.serialize.bind(extend)

  return {
    deserialize(message: MessageType): InputType {
      return implementation.deserialize(message, fallbackDeserializer)
    },

    serialize(input: InputType): MessageType {
      return implementation.serialize(input, fallbackSerializer)
    }
  }
}

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


const DefaultErrorSerializer: Serializer<SerializedError, Error> = {
  deserialize(message: SerializedError): Error {
    return Object.assign(Error(message.message), {
      name: message.name,
      stack: message.stack
    })
  },
  serialize(error: Error): SerializedError {
    return {
      __error_marker: "$$error",
      message: error.message,
      name: error.name,
      stack: error.stack
    }
  }
}

const isSerializedError = (thing: any): thing is SerializedError =>
  thing && typeof thing === "object" && "__error_marker" in thing && thing.__error_marker === "$$error"

export const DefaultSerializer: Serializer<JsonSerializable> = {
  deserialize(message: JsonSerializable): any {
    if (isSerializedError(message)) {
      return DefaultErrorSerializer.deserialize(message)
    } else {
      return message
    }
  },
  serialize(input: any): JsonSerializable {
    if (input instanceof Error) {
      return DefaultErrorSerializer.serialize(input) as any as JsonSerializable
    } else {
      return input
    }
  }
}
