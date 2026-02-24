import type { PropsWithChildren } from 'react';
import type {
  GenericDataProvider,
  InferResponse,
  InferMetaType,
  InferOptions,
  InferQuery,
  InferUIPluginProps,
  InferContextPluginProps,
} from './DataProvider';
import ResourceProvider from './ResourceProvider';
import useResource, { type ResourceProps } from './useResource';

/**
 * Provides data based on the given request details and DataProvider.
 * Context provider for the ResourceContext.
 *
 * Necessary configuration that is not directly specified is taken from the ConfigContext.
 *
 * The provided DataProvider must not be changed.
 */
export default function Resource<
  DataProviderI extends GenericDataProvider,
  ResponseI extends InferResponse<DataProviderI> = InferResponse<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
  MetaTypeI extends InferMetaType<DataProviderI> = InferMetaType<DataProviderI>,
>({
  dataProvider,
  name,
  query,
  disabled,
  options,
  persistent,
  children,
  ...rest
}: PropsWithChildren<
  ResourceProps<DataProviderI, QueryI, OptionsI> &
    InferContextPluginProps<DataProviderI> &
    InferUIPluginProps<DataProviderI>
>) {
  const context = useResource<
    DataProviderI,
    ResponseI,
    QueryI,
    OptionsI,
    MetaTypeI
  >({
    dataProvider,
    name,
    query,
    disabled,
    options,
    persistent,
    ...rest,
  });

  return (
    <ResourceProvider<DataProviderI, ResponseI, QueryI, OptionsI, MetaTypeI>
      {...rest}
      resource={context}
    >
      {children}
    </ResourceProvider>
  );
}
