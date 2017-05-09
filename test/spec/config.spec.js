import expect from 'expect.js';
import { config } from '../../';

function cloneWithMods(obj, callback) {
  const clone = JSON.parse(JSON.stringify(obj));
  callback(clone);

  return clone;
}

describe('Config', () => {

  it('can be read', () => {
    const initialConfig = config.get();
    expect(initialConfig).to.be.a('object');
  });

  it('can override existing properties', () => {
    const initialConfig = config.get();
    const newConfigFragment = {
      basepath : { web : '/scripts' }
    };

    config.set(newConfigFragment);
    const expectedNewConfig = cloneWithMods(initialConfig, (configObj) => { configObj.basepath.web = '/scripts'; });

    expect(config.get()).to.eql(expectedNewConfig);
  });

  it('can set custom properties', () => {
    config.set({ someUnknownProp : 'test' });
    expect(config.get().someUnknownProp).to.eql('test');
  });

  it('prevents setting a string config to an object', () => {
    expect(() => {
      config.set({
        basepath : {
          web : { illegal : 'object' }
        }
      });
    }).to.throwError(/Expected config property not to be an object: basepath.web/);
  });

  it('prevents setting an object config to a string', () => {
    expect(() => {
      config.set({
        basepath : 'no string allowed here'
      });
    }).to.throwError(/Expected config property to be an object: basepath/);
  });

});
