import {
  createContext,
  useContext,
  type ConsumerProps,
  type ExoticComponent,
  type ReactNode,
} from 'react';
import type {
  GenericDataProvider,
  InferItem,
  InferOptions,
  InferQuery,
  ResourceContextValue,
} from './DataProvider';

export type ConfigContextValue<DataProviderI extends GenericDataProvider> = {
  dataProvider?: DataProviderI;
};

export const ConfigContext = createContext<
  ConfigContextValue<GenericDataProvider>
>({});
ConfigContext.displayName = 'ConfigContext';
export const ConfigConsumer =
  ConfigContext.Consumer as ExoticComponent<GenericDataProvider> & {
    <DataProviderI extends GenericDataProvider>(
      props: ConsumerProps<ConfigContextValue<DataProviderI>>,
    ): ReactNode;
  };
export const useConfigContext = <DataProviderI extends GenericDataProvider>() =>
  useContext(ConfigContext) as ConfigContextValue<DataProviderI>;

export const ResourceContext = createContext<
  ResourceContextValue<GenericDataProvider>
>({
  data: [],
  notify: () => Promise.reject(new Error('Missing context provider')),
} as unknown as ResourceContextValue<GenericDataProvider>);
ResourceContext.displayName = 'ResourceContext';
export const ResourceConsumer =
  ResourceContext.Consumer as ExoticComponent<GenericDataProvider> & {
    <
      DataProviderI extends GenericDataProvider,
      ItemI extends InferItem<DataProviderI> = InferItem<DataProviderI>,
      QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
      OptionsI extends
        InferOptions<DataProviderI> = InferOptions<DataProviderI>,
    >(
      props: ConsumerProps<
        ResourceContextValue<DataProviderI, ItemI, QueryI, OptionsI>
      >,
    ): ReactNode;
  };
export const useResourceContext = <
  DataProviderI extends GenericDataProvider,
  ItemI extends InferItem<DataProviderI> = InferItem<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
>() =>
  useContext(ResourceContext) as ResourceContextValue<
    DataProviderI,
    ItemI,
    QueryI,
    OptionsI
  >;
