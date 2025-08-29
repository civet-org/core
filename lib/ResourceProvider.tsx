import type { PropsWithChildren, ReactNode } from 'react';
import type {
  GenericDataProvider,
  InferItem,
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
>({
  resource,
  children,
}: PropsWithChildren<{
  resource: ResourceContextValue<DataProviderI, ItemI, QueryI, OptionsI>;
}>): ReactNode {
  return (
    <ResourceContext.Provider value={resource}>
      {children}
    </ResourceContext.Provider>
  );
}
