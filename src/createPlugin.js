import DataStore from './DataStore';

function createPlugin(plugin) {
  if (typeof plugin !== 'function') throw new Error('No valid plugin definition specified');
  return (dataStoreClass) => {
    if (!Object.prototype.isPrototypeOf.call(DataStore, dataStoreClass)) {
      // eslint-disable-next-line no-console
      console.error(
        'A plugin should be given a derivative of the DataStore class as its first parameter',
      );
    }
    let result = class extends dataStoreClass {};
    const resourcePlugins = [];
    const extend = {
      resource: (Plugin) => {
        if (Plugin != null) resourcePlugins.push(Plugin);
      },
    };
    const output = plugin(result, extend);
    if (output != null) {
      result = output;
    }
    if (resourcePlugins.length > 0) {
      result.prototype.resourcePlugins = [
        ...(Array.isArray(result.prototype.resourcePlugins)
          ? result.prototype.resourcePlugins
          : []),
        ...resourcePlugins,
      ];
    }
    return result;
  };
}

export default createPlugin;
