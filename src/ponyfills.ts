export type SettlementResult<T> = {
  status: "fulfilled"
  value: T
} | {
  status: "rejected"
  reason: any
}

// Based on <https://github.com/es-shims/Promise.allSettled/blob/master/implementation.js>
export function allSettled<T>(values: T[]): Promise<Array<SettlementResult<T>>> {
  return Promise.all(values.map(item => {
    const onFulfill = (value: T) => {
      return { status: 'fulfilled', value } as const
    }
    const onReject = (reason: any) => {
      return { status: 'rejected', reason } as const
    }

    const itemPromise = Promise.resolve(item)
    try {
      return itemPromise.then(onFulfill, onReject)
    } catch (error) {
      return Promise.reject(error)
    }
  }))
}
