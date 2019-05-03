export interface SerializedError {
    message: string;
    name: string;
    stack?: string;
}
export declare function rehydrateError(error: SerializedError): Error;
export declare function serializeError(error: Error): SerializedError;
