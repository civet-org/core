import type { PropsWithChildren, ReactNode } from 'react';
import type {
  GenericDataProvider,
  InferItem,
  InferMetaType,
  InferOptions,
  InferQuery,
  ResourceContextValue,
} from './DataProvider';
import { ResourceContext } from './context';

export default function ResourceProvider<
  DataProviderI extends GenericDataProvider,
  ItemI extends InferItem<DataProviderI> = InferItem<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
  MetaTypeI extends InferMetaType<DataProviderI> = InferMetaType<DataProviderI>,
>({
  resource,
  children,
}: PropsWithChildren<{
  resource: ResourceContextValue<
    DataProviderI,
    ItemI,
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
