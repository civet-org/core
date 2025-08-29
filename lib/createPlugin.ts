import DataProvider, {
  type Constructor,
  type GenericDataProviderImplementation,
} from './DataProvider';

export type DataProviderImplementationWithPlugin<
  BaseDataProvider extends GenericDataProviderImplementation,
  PluginTypes,
> = Pick<BaseDataProvider, keyof BaseDataProvider> &
  Constructor<
    ConstructorParameters<BaseDataProvider>,
    InstanceType<BaseDataProvider> & PluginTypes
  >;

export type DataProviderPlugin<
  BaseDataProvider extends GenericDataProviderImplementation,
  PluginTypes,
> = <BaseDataProviderT extends BaseDataProvider>(
  baseDataProviderClass: BaseDataProviderT,
) => DataProviderImplementationWithPlugin<BaseDataProviderT, PluginTypes>;

export default function createPlugin<
  BaseDataProvider extends GenericDataProviderImplementation,
  PluginTypes,
>(
  plugin: (
    baseDataProviderClass: Pick<BaseDataProvider, keyof BaseDataProvider> &
      Constructor<
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        any[],
        InstanceType<BaseDataProvider>
      >,
  ) => DataProviderImplementationWithPlugin<
    Pick<BaseDataProvider, keyof BaseDataProvider> &
      Constructor<
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        any[],
        InstanceType<BaseDataProvider>
      >,
    PluginTypes
  >,
): DataProviderPlugin<BaseDataProvider, PluginTypes> {
  if (typeof plugin !== 'function') {
    throw new Error('No valid plugin definition specified');
  }
  return <BaseDataProviderT extends BaseDataProvider>(
    baseDataProviderClass: BaseDataProviderT,
  ): DataProviderImplementationWithPlugin<BaseDataProviderT, PluginTypes> => {
    if (
      !Object.prototype.isPrototypeOf.call(DataProvider, baseDataProviderClass)
    ) {
      console.error(
        'A plugin should be given a derivative of the DataProvider class as its first parameter',
      );
    }

    const classCopy = class extends baseDataProviderClass {} as unknown as Pick<
      BaseDataProvider,
      keyof BaseDataProvider
    > &
      Constructor<
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        any[],
        InstanceType<BaseDataProvider>
      >;

    const result = plugin(classCopy);
    if (result == null) {
      throw new Error(
        'A plugin is expected to return a derivative of the DataProvider class but returned nothing',
      );
    }
    return result as unknown as DataProviderImplementationWithPlugin<
      BaseDataProviderT,
      PluginTypes
    >;
  };
}
