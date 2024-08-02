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
    const result = plugin(class extends dataStoreClass {});
    if (result == null) {
      throw new Error(
        'A plugin is expected to return a derivative of the DataStore class but returned nothing',
      );
    }
    return result;
  };
}

export default createPlugin;
