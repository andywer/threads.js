import { extendSerializer, DefaultSerializer } from "../serializers/index"
import { MessageRelay } from "../types/common"
import {
  JsonSerializable,
  Serializer,
  SerializerImplementation
} from "../types/serializers"

let registeredSerializer: Serializer<JsonSerializable> = DefaultSerializer()

export function getRegisteredSerializer() {
  return registeredSerializer
}

export function registerSerializer(serializer: SerializerImplementation<JsonSerializable>) {
  registeredSerializer = extendSerializer(registeredSerializer, serializer)
}

export function deserialize(message: JsonSerializable, origin: MessageRelay): any {
  return registeredSerializer.deserialize(message, origin)
}

export function serialize(input: any): JsonSerializable {
  return registeredSerializer.serialize(input)
}
