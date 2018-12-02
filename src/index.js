import { ConfigContext, ResourceContext } from './context';

export const ConfigConsumer = ConfigContext.Consumer;

export const ResourceProvider = ResourceContext.Provider;
export const ResourceConsumer = ResourceContext.Consumer;

export { default as ConfigProvider } from './ConfigProvider';
export { default as Resource } from './Resource';
export { default as DataStore } from './DataStore';
