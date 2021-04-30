// tslint:disable no-eval

// TODO remove webpack hacks. These hurt the performance for non-web-pack situations
// Webpack hack
export declare let __non_webpack_require__: typeof require
export const isWebpack = typeof __non_webpack_require__ === "function"
export const requireFunction: typeof require = isWebpack ? __non_webpack_require__ : eval("require")
