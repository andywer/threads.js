// tslint:disable max-classes-per-file

import { $callback } from "../symbols"

export interface Callback<Fn extends (...args: any[]) => any = (...args: any[]) => any> {
  (...args: Parameters<Fn>): ReturnType<Fn>
  [$callback]: true
  id: number
  release(): void
}

let nextLocalCallbackID = 1
let nextRemoteCallbackID = 1

const registeredLocalCallbacks = new Map<number, Callback>()
const registeredRemoteCallbacks = new Map<number, Callback>()

export function isCallback(thing: any): thing is Callback<any> {
  return typeof thing === "function" && thing[$callback]
}

export function lookupLocalCallback(id: number): Callback<any> | undefined {
  return registeredLocalCallbacks.get(id)
}

function registerCallback(callback: Callback<any>) {
  registeredLocalCallbacks.set(callback.id, callback)
  return callback
}

function unregisterCallback(callback: Callback<any>) {
  registeredLocalCallbacks.delete(callback.id)
  return callback
}

export function lookupRemoteCallback(id: number) {
  return registeredRemoteCallbacks.get(id)
}

function registerRemoteCallback<Fn extends (...args: any[]) => any>(callback: Callback<Fn>): Callback<Fn> {
  registeredRemoteCallbacks.set(callback.id, callback)
  return callback
}

function unregisterRemoteCallback<Fn extends (...args: any[]) => any>(callback: Callback<Fn>): Callback<Fn> {
  registeredRemoteCallbacks.delete(callback.id)
  return callback
}

export function Callback<Fn extends (...args: any[]) => any>(fn: Fn) {
  const callback = ((...args: any[]) => fn(...args)) as Callback<Fn>
  callback[$callback] = true
  callback.id = nextLocalCallbackID++
  callback.release = () => unregisterCallback(callback)
  return registerCallback(callback)
}

export function RemoteCallback<Fn extends (...args: any[]) => any>(fn: Fn) {
  const callback = ((...args: any[]) => fn(...args)) as Callback<Fn>
  callback[$callback] = true
  callback.id = nextRemoteCallbackID++
  callback.release = () => unregisterRemoteCallback(callback)
  return registerRemoteCallback(callback)
}

export function SingleExposedCallback<Fn extends (...args: any[]) => any>(fn: Fn) {
  const callback = ((...args: any[]) => fn(...args)) as Callback<Fn>
  callback[$callback] = true
  callback.id = 0
  callback.release = () => unregisterCallback(callback)
  return registerCallback(callback)
}
