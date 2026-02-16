import type { AbortSignalProxy } from '@/AbortSignal';
import type {
  ContinuousGet,
  GenericDataProviderImplementation,
  InferGetResult,
  InferMetaType,
  InferOptions,
  InferQuery,
} from '@/DataProvider';
import createPlugin from '@/createPlugin';
import DemoDataProvider from './DemoDataProvider';

const demoPlugin = createPlugin<
  GenericDataProviderImplementation,
  { demo(): string }
>(
  (baseDataProviderClass) =>
    class ExtendedDataProvider extends baseDataProviderClass {
      demo(): string {
        return 'demo';
      }

      handleGet(
        resource: string,
        query: InferQuery<this>,
        options: InferOptions<this> | undefined,
        meta: InferMetaType<this>,
        abortSignal: AbortSignalProxy,
      ):
        | Promise<InferGetResult<this> | ContinuousGet<InferGetResult<this>>>
        | InferGetResult<this>
        | ContinuousGet<InferGetResult<this>> {
        return super.handleGet(resource, query, options, meta, abortSignal);
      }
    },
);

const PluginProvider = demoPlugin(DemoDataProvider);

new PluginProvider('ja').demo();
console.log(PluginProvider.TEST);
