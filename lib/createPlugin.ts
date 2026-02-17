import DataProvider, {
  type GenericDataProviderImplementation,
} from './DataProvider';
import type { Constructor } from './utilityTypes';

type InstanceTypeExtension<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  BaseClass extends new (...args: any) => any,
  InstanceTypeExtension,
> = Pick<BaseClass, keyof BaseClass> &
  Constructor<
    ConstructorParameters<BaseClass>,
    InstanceType<BaseClass> & InstanceTypeExtension
  >;

type PluginBaseDataProvider<
  BaseDataProvider extends GenericDataProviderImplementation,
> = Pick<BaseDataProvider, keyof BaseDataProvider> &
  Constructor<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any[],
    InstanceType<BaseDataProvider>
  >;

type PluginExtendedDataProvider<
  BaseDataProvider extends GenericDataProviderImplementation,
  PluginTypes,
> = InstanceTypeExtension<
  PluginBaseDataProvider<BaseDataProvider>,
  PluginTypes
>;

export type DataProviderImplementationWithPlugin<
  BaseDataProvider extends GenericDataProviderImplementation,
  DataProviderPluginTypes,
  ContextPluginProps,
  ContextPluginTypes,
  UIPluginProps,
  UIPluginTypes,
> = InstanceTypeExtension<
  BaseDataProvider,
  {
    _inferContextPluginProps: ContextPluginProps;
    _inferContextPluginTypes: ContextPluginTypes;
    _inferUIPluginProps: UIPluginProps;
    _inferUIPluginTypes: UIPluginTypes;
  } & DataProviderPluginTypes
>;

export type DataProviderPlugin<
  BaseDataProvider extends GenericDataProviderImplementation,
  DataProviderPluginTypes,
  ContextPluginProps,
  ContextPluginTypes,
  UIPluginProps,
  UIPluginTypes,
> = <BaseDataProviderT extends BaseDataProvider>(
  baseDataProviderClass: BaseDataProviderT,
) => DataProviderImplementationWithPlugin<
  BaseDataProviderT,
  DataProviderPluginTypes,
  ContextPluginProps,
  ContextPluginTypes,
  UIPluginProps,
  UIPluginTypes
>;

export default function createPlugin<
  BaseDataProvider extends GenericDataProviderImplementation,
  DataProviderPluginTypes = unknown,
  ContextPluginProps = unknown,
  ContextPluginTypes = unknown,
  UIPluginProps = unknown,
  UIPluginTypes = unknown,
>(
  plugin: (
    baseDataProviderClass: PluginBaseDataProvider<BaseDataProvider>,
  ) => PluginExtendedDataProvider<BaseDataProvider, DataProviderPluginTypes>,
): DataProviderPlugin<
  BaseDataProvider,
  DataProviderPluginTypes,
  ContextPluginProps,
  ContextPluginTypes,
  UIPluginProps,
  UIPluginTypes
> {
  if (typeof plugin !== 'function') {
    throw new Error('No valid plugin definition specified');
  }
  return <BaseDataProviderT extends BaseDataProvider>(
    baseDataProviderClass: BaseDataProviderT,
  ): DataProviderImplementationWithPlugin<
    BaseDataProviderT,
    DataProviderPluginTypes,
    ContextPluginProps,
    ContextPluginTypes,
    UIPluginProps,
    UIPluginTypes
  > => {
    if (
      !Object.prototype.isPrototypeOf.call(DataProvider, baseDataProviderClass)
    ) {
      console.error(
        'A plugin should be given a derivative of the DataProvider class as its first parameter',
      );
    }

    const classCopy =
      class extends baseDataProviderClass {} as unknown as PluginBaseDataProvider<BaseDataProvider>;

    const result = plugin(classCopy);
    if (result == null) {
      throw new Error(
        'A plugin is expected to return a derivative of the DataProvider class but returned nothing',
      );
    }
    return result as unknown as DataProviderImplementationWithPlugin<
      BaseDataProviderT,
      DataProviderPluginTypes,
      ContextPluginProps,
      ContextPluginTypes,
      UIPluginProps,
      UIPluginTypes
    >;
  };
}
