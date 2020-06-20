import { SerializedError, Serializer } from "../types/serializers"

export const DefaultErrorSerializer = (): Serializer<SerializedError, Error> => ({
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
})

export const isSerializedError = (thing: any): thing is SerializedError =>
  thing && typeof thing === "object" && "__error_marker" in thing && thing.__error_marker === "$$error"
