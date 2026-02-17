import type { ComponentProps } from 'react';
import type { AbortSignalProxy } from '@/AbortSignal';
import type {
  ContinuousGet,
  DataProviderExtend,
  GenericDataProvider,
  GenericDataProviderImplementation,
  InferMetaType,
  InferOptions,
  InferQuery,
  InferResponse,
  ResourceContextValue,
} from '@/DataProvider';
import Resource from '@/Resource';
import type { useResourceContext } from '@/context';
import createPlugin from '@/createPlugin';
import type useResource from '@/useResource';
import DemoDataProvider from './DemoDataProvider';

const demoPlugin = createPlugin<
  GenericDataProviderImplementation,
  { demo(): string },
  { demoContextPropValid: boolean },
  { demoContextTypeValid: boolean },
  { demoUIPropValid: boolean },
  { demoUITypeValid: boolean }
>(
  (baseDataProviderClass) =>
    class ExtendedDataProvider extends baseDataProviderClass {
      demo(): string {
        return 'demo';
      }

      extend(extend: DataProviderExtend): void {
        extend.context(
          (
            context: ResourceContextValue<GenericDataProvider>,
            props: { a: boolean },
          ): ResourceContextValue<GenericDataProvider> & { a: boolean } => ({
            ...context,
            a: props.a,
          }),
        );
      }

      handleGet(
        resource: string,
        query: InferQuery<this>,
        options: InferOptions<this> | undefined,
        meta: InferMetaType<this>,
        abortSignal: AbortSignalProxy,
      ):
        | Promise<InferResponse<this> | ContinuousGet<InferResponse<this>>>
        | InferResponse<this>
        | ContinuousGet<InferResponse<this>> {
        return super.handleGet(resource, query, options, meta, abortSignal);
      }
    },
);

const demo2Plugin = createPlugin<
  GenericDataProviderImplementation,
  { demo2(): string },
  { demo2ContextPropValid: boolean },
  { demo2ContextTypeValid: boolean }
>(
  (baseDataProviderClass) =>
    class ExtendedDataProvider extends baseDataProviderClass {
      demo2(): string {
        return 'demo2';
      }
    },
);

const PluginProvider = demo2Plugin(demoPlugin(DemoDataProvider));

new PluginProvider('ja').demo();
new PluginProvider('ja').demo2();
console.log(PluginProvider.TEST);

type PluginProviderType = InstanceType<typeof PluginProvider>;
type pluginHook = typeof useResource<PluginProviderType>;
const _hookDemoContextPropValidIsBool: Parameters<pluginHook>[0]['demoContextPropValid'] = true;
const _hookDemo2ContextPropValidIsBool: Parameters<pluginHook>[0]['demo2ContextPropValid'] = true;
// const _hookDemoUIPropValidIsNoBool: Parameters<pluginHook>[0]['demoUIPropValid'] = true;
const _hookDemoContextTypeValidIsBool: ReturnType<pluginHook>['demoContextTypeValid'] = true;
const _hookDemo2ContextTypeValidIsBool: ReturnType<pluginHook>['demo2ContextTypeValid'] = true;
// const _hookDemoUITypeValidIsNoBool: ReturnType<pluginHook>['demoUITypeValid'] = true;

type PluginResource = typeof Resource<PluginProviderType>;
const _resourceDemoContextPropValidIsBool: ComponentProps<PluginResource>['demoContextPropValid'] = true;
const _resourceDemo2ContextPropValidIsBool: ComponentProps<PluginResource>['demo2ContextPropValid'] = true;
const _resourceDemoUIPropValidIsBool: ComponentProps<PluginResource>['demoUIPropValid'] = true;

type pluginContext = typeof useResourceContext<PluginProviderType>;
const _contextDemoContextTypeValidIsBool: ReturnType<pluginContext>['demoContextTypeValid'] = true;
const _contextDemo2ContextTypeValidIsBool: ReturnType<pluginContext>['demo2ContextTypeValid'] = true;
const _contextDemoUITypeValidIsBool: ReturnType<pluginContext>['demoUITypeValid'] = true;
