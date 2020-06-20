/**
 * Make sure that there is only ever one listener set on that event emitter.
 * Do so by setting a single event handler that then calls all the
 * event listeners.
 */
export function multiplexEventTarget(emitter: Pick<EventTarget, "addEventListener" | "removeEventListener">) {
  const eventListeners = new Map<string, Set<(...args: any[]) => any>>()

  function addEventListener(event: string, listener: EventListener) {
    if (eventListeners.has(event)) {
      eventListeners.get(event)!.add(listener)
    } else {
      eventListeners.set(event, new Set([listener]))

      emitter.addEventListener(event, (...args: any[]) => {
        const listeners = eventListeners.get(event) || []

        for (const callback of listeners) {
          callback(...args)
        }
      })
    }
  }

  function removeEventListener(event: string, listener: EventListener) {
    if (eventListeners.has(event)) {
      eventListeners.get(event)!.delete(listener)
    }
  }

  return {
    addEventListener,
    removeEventListener
  }
}
