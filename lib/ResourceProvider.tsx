import type { PropsWithChildren, ReactNode } from 'react';
import type {
  GenericDataProvider,
  InferGetResult,
  InferMetaType,
  InferOptions,
  InferQuery,
  ResourceContextValue,
} from './DataProvider';
import { ResourceContext } from './context';

export default function ResourceProvider<
  DataProviderI extends GenericDataProvider,
  GetResultI extends InferGetResult<DataProviderI> =
    InferGetResult<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
  MetaTypeI extends InferMetaType<DataProviderI> = InferMetaType<DataProviderI>,
>({
  resource,
  children,
}: PropsWithChildren<{
  resource: ResourceContextValue<
    DataProviderI,
    GetResultI,
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
