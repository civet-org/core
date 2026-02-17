import type { PropsWithChildren, ReactNode } from 'react';
import type {
  GenericDataProvider,
  InferResponse,
  InferMetaType,
  InferOptions,
  InferQuery,
  ResourceContextValue,
  InferContextPluginTypes,
  InferUIPluginProps,
  InferUIPluginTypes,
} from './DataProvider';
import { ResourceContextProvider } from './context';

export default function ResourceProvider<
  DataProviderI extends GenericDataProvider,
  ResponseI extends InferResponse<DataProviderI> = InferResponse<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
  MetaTypeI extends InferMetaType<DataProviderI> = InferMetaType<DataProviderI>,
>({
  resource,
  children,
  ...rest
}: PropsWithChildren<
  {
    resource: ResourceContextValue<
      DataProviderI,
      ResponseI,
      QueryI,
      OptionsI,
      MetaTypeI
    > &
      InferContextPluginTypes<DataProviderI>;
  } & InferUIPluginProps<DataProviderI>
>): ReactNode {
  return resource.dataProvider.uiPlugins.reduceRight<
    (context: ResourceContextValue<GenericDataProvider>) => ReactNode
  >(
    (next, Plugin) => (result) => (
      <Plugin {...rest} context={result}>
        {next}
      </Plugin>
    ),
    (result) => (
      <ResourceContextProvider<
        DataProviderI,
        ResponseI,
        QueryI,
        OptionsI,
        MetaTypeI
      >
        value={
          result as ResourceContextValue<
            DataProviderI,
            ResponseI,
            QueryI,
            OptionsI,
            MetaTypeI
          > &
            InferContextPluginTypes<DataProviderI> &
            InferUIPluginTypes<DataProviderI>
        }
      >
        {children}
      </ResourceContextProvider>
    ),
  )(resource);
}
