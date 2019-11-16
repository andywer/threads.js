// Source: <https://github.com/parcel-bundler/parcel/blob/master/packages/core/parcel-bundler/src/builtins/bundle-url.js>

let bundleURL: string | undefined

function getBundleURLCached(): string {
  if (!bundleURL) {
    bundleURL = getBundleURL()
  }

  return bundleURL
}

function getBundleURL(): string {
  // Attempt to find the URL of the current script and use that as the base URL
  try {
    throw new Error
  } catch (err) {
    const matches = ("" + err.stack).match(/(https?|file|ftp|chrome-extension|moz-extension):\/\/[^)\n]+/g)
    if (matches) {
      return getBaseURL(matches[0])
    }
  }

  return "/"
}

function getBaseURL(url: string): string {
  return ("" + url).replace(/^((?:https?|file|ftp|chrome-extension|moz-extension):\/\/.+)?\/[^/]+(?:\?.*)?$/, '$1') + '/';
}

export {
  getBaseURL,
  getBundleURLCached as getBundleURL
}
