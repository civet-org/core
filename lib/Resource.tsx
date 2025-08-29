import type { ReactNode } from 'react';
import type {
  GenericDataProvider,
  InferItem,
  InferOptions,
  InferQuery,
  Persistence,
  ResourceContextValue,
} from './DataProvider';
import ResourceProvider from './ResourceProvider';
import useResource from './useResource';

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
  ItemI extends InferItem<DataProviderI> = InferItem<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
>({
  dataProvider,
  name,
  query,
  empty,
  options,
  persistent,
  children,
  ...rest
}: {
  dataProvider?: DataProviderI;
  name: string;
  query: QueryI;
  empty?: boolean;
  options?: OptionsI;
  persistent?: Persistence;
  children?: ReactNode;
  [rest: string]: unknown;
}) {
  const context = useResource<DataProviderI, ItemI, QueryI, OptionsI>({
    dataProvider,
    name,
    query,
    empty,
    options,
    persistent,
    ...rest,
  });

  return context.dataProvider.uiPlugins.reduceRight(
    (next, Plugin) => (result) => (
      <Plugin {...rest} context={result}>
        {next}
      </Plugin>
    ),
    (result: ResourceContextValue<GenericDataProvider>) => (
      <ResourceProvider resource={result}>{children}</ResourceProvider>
    ),
  )(context);
}
