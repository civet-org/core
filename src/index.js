import { ConfigContext, ResourceContext } from './context';

export const { Consumer: ConfigConsumer } = ConfigContext;
export const { Provider: ResourceProvider, Consumer: ResourceConsumer } = ResourceContext;

export { default as ConfigProvider } from './ConfigProvider';
export { default as Resource } from './Resource';
export { default as DataStore, isDataStore, dataStorePropType } from './DataStore';
