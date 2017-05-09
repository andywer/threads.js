const configuration = {
  basepath : {
    node : '',
    web  : ''
  },
  fallback : {
    slaveScriptUrl : ''
  }
};

function configDeepMerge(destObj, srcObj, ancestorProps = []) {
  Object.keys(srcObj).forEach((propKey) => {
    const srcValue = srcObj[ propKey ];
    const ancestorPropsAndThis = ancestorProps.concat([ propKey ]);

    if (typeof srcValue === 'object') {
      if (typeof destObj[ propKey ] !== 'undefined' && typeof destObj[ propKey ] !== 'object') {
        throw new Error('Expected config property not to be an object: ' + ancestorPropsAndThis.join('.'));
      }
      configDeepMerge(destObj[ propKey ], srcValue, ancestorPropsAndThis);
    } else {
      if (typeof destObj[ propKey ] === 'object') {
        throw new Error('Expected config property to be an object: ' + ancestorPropsAndThis.join('.'));
      }
      destObj[ propKey ] = srcValue;
    }
  });
}

const config = {
  get: () => configuration,

  set: (newConfig) => {
    if (typeof newConfig !== 'object') {
      throw new Error('Expected config object.');
    }

    configDeepMerge(configuration, newConfig);
  }
};

export default config;

export function getConfig () {
  return config.get();
}

export function setConfig (...args) {
  return config.set(...args);
}
