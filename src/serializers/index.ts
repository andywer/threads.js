import { isCallback } from "../common/callbacks"
import { MessageRelay } from "../types/common"
import { JsonSerializable, Serializer, SerializerImplementation } from "../types/serializers"
import { isSerializedCallback, DefaultCallbackSerializer } from "./callbacks"
import { isSerializedError, DefaultErrorSerializer } from "./errors"

export {
  JsonSerializable,
  Serializer,
  SerializerImplementation
}

export function extendSerializer<MessageType, InputType = any>(
  extend: Serializer<MessageType, InputType>,
  implementation: SerializerImplementation<MessageType, InputType>
): Serializer<MessageType, InputType> {
  const fallbackSerializer = extend.serialize.bind(extend)

  return {
    deserialize(message: MessageType, origin: MessageRelay): InputType {
      const fallback = (msg: MessageType) => extend.deserialize(msg, origin)
      return implementation.deserialize(message, fallback)
    },

    serialize(input: InputType): MessageType {
      return implementation.serialize(input, fallbackSerializer)
    }
  }
}


export const DefaultSerializer = (): Serializer<JsonSerializable> => {
  const serializer: Serializer<JsonSerializable> = {
    deserialize(message: JsonSerializable, sender: MessageRelay | null): any {
      if (isSerializedError(message)) {
        return errorSerializer.deserialize(message, sender)
      } else if (isSerializedCallback(message)) {
        return callbackSerializer.deserialize(message, sender)
      } else {
        return message
      }
    },
    serialize(input: any): JsonSerializable {
      if (input instanceof Error) {
        return errorSerializer.serialize(input) as any as JsonSerializable
      } else if (isCallback(input)) {
        return callbackSerializer.serialize(input) as any as JsonSerializable
      } else {
        return input
      }
    }
  }

  const callbackSerializer = DefaultCallbackSerializer(serializer)
  const errorSerializer = DefaultErrorSerializer()

  return serializer
}
