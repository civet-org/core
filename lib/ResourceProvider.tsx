import type { PropsWithChildren, ReactNode } from 'react';
import type {
  GenericDataProvider,
  InferResponse,
  InferMetaType,
  InferOptions,
  InferQuery,
  ResourceContextValue,
} from './DataProvider';
import { ResourceContext } from './context';

export default function ResourceProvider<
  DataProviderI extends GenericDataProvider,
  ResponseI extends InferResponse<DataProviderI> = InferResponse<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
  MetaTypeI extends InferMetaType<DataProviderI> = InferMetaType<DataProviderI>,
>({
  resource,
  children,
}: PropsWithChildren<{
  resource: ResourceContextValue<
    DataProviderI,
    ResponseI,
    QueryI,
    OptionsI,
    MetaTypeI
  >;
}>): ReactNode {
  return (
    <ResourceContext.Provider value={resource}>
      {children}
    </ResourceContext.Provider>
  );
}
