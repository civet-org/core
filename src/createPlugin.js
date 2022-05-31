import DataProvider from './DataProvider';

function createPlugin(plugin) {
  if (typeof plugin !== 'function') throw new Error('No valid plugin definition specified');
  return (dataProviderClass) => {
    if (!Object.prototype.isPrototypeOf.call(DataProvider, dataProviderClass)) {
      // eslint-disable-next-line no-console
      console.error(
        'A plugin should be given a derivative of the DataProvider class as its first parameter',
      );
    }
    const result = plugin(class extends dataProviderClass {});
    if (result == null) {
      throw new Error(
        'A plugin is expected to return a derivative of the DataProvider class but returned nothing',
      );
    }
    return result;
  };
}

export default createPlugin;
