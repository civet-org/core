import type { AbortSignalProxy } from '@/AbortSignal';
import type {
  ContinuousGet,
  GenericDataProviderImplementation,
  InferInstance,
  InferItem,
  InferOptions,
  InferQuery,
} from '@/DataProvider';
import type Meta from '@/Meta';
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
        meta: Meta<InferInstance<this>>,
        abortSignal: AbortSignalProxy,
      ):
        | Promise<InferItem<this>[]>
        | InferItem<this>[]
        | ContinuousGet<InferItem<this>> {
        return super.handleGet(resource, query, options, meta, abortSignal);
      }
    },
);

const PluginProvider = demoPlugin(DemoDataProvider);

new PluginProvider('ja').demo();
console.log(PluginProvider.TEST);
