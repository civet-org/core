import {
  createContext,
  useContext,
  type Consumer,
  type ConsumerProps,
  type Provider,
  type ProviderProps,
  type ReactNode,
} from 'react';
import type {
  GenericDataProvider,
  InferResponse,
  InferMetaType,
  InferOptions,
  InferQuery,
  ResourceContextValue,
  InferContextPluginTypes,
  InferUIPluginTypes,
} from './DataProvider';

export type ConfigContextValue<DataProviderI extends GenericDataProvider> = {
  dataProvider?: DataProviderI;
};

export const ConfigContext = createContext<
  ConfigContextValue<GenericDataProvider>
>({});
ConfigContext.displayName = 'ConfigContext';
export const ConfigConsumer = ConfigContext.Consumer as Consumer<
  ConfigContextValue<GenericDataProvider>
> & {
  <DataProviderI extends GenericDataProvider>(
    props: ConsumerProps<ConfigContextValue<DataProviderI>>,
  ): ReactNode;
};
export const useConfigContext = <DataProviderI extends GenericDataProvider>() =>
  useContext(ConfigContext) as ConfigContextValue<DataProviderI>;

const ResourceContext = createContext<
  ResourceContextValue<GenericDataProvider>
>({
  name: '',
  query: undefined,
  options: undefined,
  request: '',
  revision: '',
  data: undefined,
  meta: {},
  error: undefined,
  isDisabled: true,
  isIncomplete: false,
  isInitial: true,
  dataProvider: undefined as unknown as GenericDataProvider,
  isLoading: false,
  isStale: false,
  next: { request: '', revision: '' },
  notify: () => Promise.reject(new Error('Missing context provider')),
});
ResourceContext.displayName = 'ResourceContext';
export const ResourceContextProvider = ResourceContext.Provider as Provider<
  ResourceContextValue<GenericDataProvider>
> & {
  <
    DataProviderI extends GenericDataProvider,
    ResponseI extends InferResponse<DataProviderI> =
      InferResponse<DataProviderI>,
    QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
    OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
    MetaTypeI extends InferMetaType<DataProviderI> =
      InferMetaType<DataProviderI>,
  >(
    props: ProviderProps<
      ResourceContextValue<
        DataProviderI,
        ResponseI,
        QueryI,
        OptionsI,
        MetaTypeI
      > &
        InferContextPluginTypes<DataProviderI> &
        InferUIPluginTypes<DataProviderI>
    >,
  ): ReactNode;
};
export const ResourceConsumer = ResourceContext.Consumer as Consumer<
  ResourceContextValue<GenericDataProvider>
> & {
  <
    DataProviderI extends GenericDataProvider,
    ResponseI extends InferResponse<DataProviderI> =
      InferResponse<DataProviderI>,
    QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
    OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
    MetaTypeI extends InferMetaType<DataProviderI> =
      InferMetaType<DataProviderI>,
  >(
    props: ConsumerProps<
      ResourceContextValue<
        DataProviderI,
        ResponseI,
        QueryI,
        OptionsI,
        MetaTypeI
      > &
        InferContextPluginTypes<DataProviderI> &
        InferUIPluginTypes<DataProviderI>
    >,
  ): ReactNode;
};
export const useResourceContext = <
  DataProviderI extends GenericDataProvider,
  ResponseI extends InferResponse<DataProviderI> = InferResponse<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
  MetaTypeI extends InferMetaType<DataProviderI> = InferMetaType<DataProviderI>,
>() =>
  useContext(ResourceContext) as ResourceContextValue<
    DataProviderI,
    ResponseI,
    QueryI,
    OptionsI,
    MetaTypeI
  > &
    InferContextPluginTypes<DataProviderI> &
    InferUIPluginTypes<DataProviderI>;
