import deepEquals from 'fast-deep-equal';
import objectHash from 'object-hash';
import type { ReactNode } from 'react';
import AbortSignal, { type AbortSignalProxy } from './AbortSignal';
import ChannelNotifier from './ChannelNotifier';
import Meta, {
  type InferInstance,
  type InferSchema,
  type MetaLike,
} from './Meta';
import type { Constructor } from './utilityTypes';

const getMeta = <MetaI extends Meta>(
  meta: MetaLike<MetaI> | undefined,
): MetaI => (meta instanceof Meta ? meta : new Meta(meta)) as MetaI;

export type RequestDetails<Query, Options> = {
  name: string;
  query: Query;
  disabled: boolean;
  options: Options | undefined;
};

export type ResourceBaseContext<
  Response,
  Query,
  Options,
  MetaType extends Meta,
> = {
  name: string;
  query: Query;
  options: Options | undefined;
  request: string;
  revision: string;
  data: Response;
  meta: InferSchema<MetaType>;
  error: Error | undefined;
  isDisabled: boolean;
  isIncomplete: boolean;
  isInitial: boolean;
};

export type ResourceContextValue<
  DataProviderI extends GenericDataProvider,
  ResponseI extends InferResponse<DataProviderI> = InferResponse<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
  MetaTypeI extends InferMetaType<DataProviderI> = InferMetaType<DataProviderI>,
> = ResourceBaseContext<ResponseI, QueryI, OptionsI, MetaTypeI> & {
  dataProvider: DataProviderI;
  isLoading: boolean;
  isStale: boolean;
  next: { request: string; revision: string };
  notify: () => Promise<{ request: string; revision: string }>;
};

export type ContextPlugin<PluginProps = unknown, PluginTypes = unknown> = (
  context: ResourceContextValue<GenericDataProvider>,
  props: PluginProps,
) => ResourceContextValue<GenericDataProvider> & PluginTypes;

export type UIPlugin<
  PluginProps = unknown,
  PluginTypes = unknown,
> = React.ComponentType<
  PluginProps & {
    context: ResourceContextValue<GenericDataProvider>;
    children: (
      context: ResourceContextValue<GenericDataProvider> & PluginTypes,
    ) => ReactNode;
  }
>;

export type Persistence = boolean | 'very';

export interface GetCallback<Response> {
  (error: undefined, done: boolean, result: Response): void;
  (error: Error, done: boolean, result: undefined): void;
}

export type ContinuousGet<Response> = (callback: GetCallback<Response>) => void;

export type DataProviderExtend = {
  context: <PluginProps, PluginTypes>(
    plugin: ContextPlugin<PluginProps, PluginTypes>,
  ) => void;
  ui: <PluginProps, PluginTypes>(
    plugin: UIPlugin<PluginProps, PluginTypes>,
  ) => void;
};

export default abstract class DataProvider<
  Item,
  Query,
  Options,
  MetaType extends Meta = Meta,
  Response extends Item | Item[] = Item | Item[],
  ContextPluginProps = unknown,
  ContextPluginTypes = unknown,
  UIPluginProps = unknown,
  UIPluginTypes = unknown,
> {
  readonly _inferItem!: Item;
  readonly _inferQuery!: Query;
  readonly _inferOptions!: Options;
  readonly _inferMetaType!: MetaType;
  readonly _inferResponse!: Response;
  readonly _inferContextPluginProps!: ContextPluginProps;
  readonly _inferContextPluginTypes!: ContextPluginTypes;
  readonly _inferUIPluginProps!: UIPluginProps;
  readonly _inferUIPluginTypes!: UIPluginTypes;

  notifier = new ChannelNotifier();
  readonly contextPlugins: ContextPlugin[] = [];
  readonly uiPlugins: UIPlugin[] = [];

  constructor() {
    const contextPlugins: ContextPlugin[] = [];
    const uiPlugins: UIPlugin[] = [];
    this.extend({
      context: (plugin) => {
        const plugins = contextPlugins;
        if (plugin != null && !plugins.includes(plugin as ContextPlugin))
          plugins.push(plugin as ContextPlugin);
      },
      ui: (plugin) => {
        const plugins = uiPlugins;
        if (plugin != null && !plugins.includes(plugin as UIPlugin))
          plugins.push(plugin as UIPlugin);
      },
    });
    Object.defineProperties(this, {
      contextPlugins: {
        value: Object.freeze([...contextPlugins]),
        enumerable: true,
        writable: false,
        configurable: false,
      },
      uiPlugins: {
        value: Object.freeze([...uiPlugins]),
        enumerable: true,
        writable: false,
        configurable: false,
      },
    });
  }

  extend(_extend: DataProviderExtend): void {}

  createInstance(): InferInstance<MetaType> | undefined {
    return undefined;
  }

  releaseInstance(_: InferInstance<MetaType>): void {}

  subscribe(resource: string, callback: () => void): () => void {
    if (resource == null) throw new Error('No resource name specified');
    return this.notifier.subscribe(resource, callback);
  }

  notify(resource: string): void {
    this.notifier.trigger(resource);
  }

  get<
    ResponseI extends Response = Response,
    QueryI extends Query = Query,
    OptionsI extends Options = Options,
    MetaTypeI extends MetaType = MetaType,
  >(
    resource: string,
    query: QueryI,
    options?: OptionsI,
    meta?: MetaLike<MetaTypeI>,
    abortSignal?: AbortSignal,
  ): Promise<ResponseI> {
    return new Promise((resolve, reject) =>
      this.continuousGet<ResponseI, QueryI, OptionsI, MetaTypeI>(
        resource,
        query,
        options,
        meta,
        (
          error: Error | undefined,
          done: boolean,
          result: ResponseI | undefined,
        ) => {
          if (error != null) {
            reject(error);
            return;
          }
          if (done)
            resolve(
              result ??
                (this.createEmptyResponse({
                  name: resource,
                  query,
                  disabled: false,
                  options,
                }) as ResponseI),
            );
        },
        abortSignal,
      ),
    );
  }

  continuousGet<
    ResponseI extends Response = Response,
    QueryI extends Query = Query,
    OptionsI extends Options = Options,
    MetaTypeI extends MetaType = MetaType,
  >(
    resource: string,
    query: QueryI,
    options: OptionsI | undefined,
    meta: MetaLike<MetaTypeI> | undefined,
    callback: GetCallback<ResponseI>,
    abortSignal?: AbortSignal,
  ): void {
    const signal = abortSignal == null ? new AbortSignal() : abortSignal;

    new Promise((resolve) => {
      if (resource == null) throw new Error('No resource name specified');

      // result transformation
      const cb = (
        error: Error | undefined,
        done: boolean,
        result: ResponseI | undefined,
      ): void => {
        // prevent updates after completion
        if (signal.locked) return;
        if (error != null || done) {
          signal.lock();
        }
        if (error != null) callback(error, true, undefined);
        else
          callback(
            undefined,
            done,
            result ??
              (this.createEmptyResponse({
                name: resource,
                query,
                disabled: false,
                options,
              }) as ResponseI),
          );
      };

      const proxy = signal.proxy();

      resolve(
        Promise.resolve(
          this.handleGet(resource, query, options, getMeta(meta), proxy) as
            | Promise<ResponseI | ContinuousGet<ResponseI>>
            | ResponseI
            | ContinuousGet<ResponseI>,
        ).then((result) => {
          if (typeof result === 'function') {
            (result as ContinuousGet<ResponseI>)(cb);
          } else {
            cb(undefined, true, result);
          }
        }),
      );
    }).catch((e) => {
      if (!signal.locked) callback(e, true, undefined!);
    });
  }

  abstract handleGet(
    resource: string,
    query: Query,
    options: Options | undefined,
    meta: MetaType,
    abortSignal: AbortSignalProxy,
  ):
    | Promise<Response | ContinuousGet<Response>>
    | Response
    | ContinuousGet<Response>;

  compareRequests(
    nextRequestDetails: RequestDetails<Query, Options>,
    prevRequestDetails: RequestDetails<Query, Options>,
  ): boolean {
    return deepEquals(nextRequestDetails, prevRequestDetails);
  }

  createEmptyResponse(
    _requestDetails: RequestDetails<Query, Options>,
  ): Response {
    return undefined as Response;
  }

  shouldPersist(
    nextRequestDetails: RequestDetails<Query, Options>,
    prevRequestDetails: RequestDetails<Query, Options>,
    persistent: Persistence,
    _context: ResourceBaseContext<Response, Query, Options, MetaType>,
  ): boolean {
    return (
      persistent === 'very' ||
      (persistent && prevRequestDetails.name === nextRequestDetails.name)
    );
  }

  compareItemVersions(_item1: Item, _item2: Item): boolean {
    return true;
  }

  getItemIdentifier(item: Item): string | undefined {
    return objectHash(item as object);
  }

  transition(
    nextContext: ResourceBaseContext<Response, Query, Options, MetaType>,
    _prevContext: ResourceBaseContext<Response, Query, Options, MetaType>,
  ): Response {
    return nextContext.data;
  }

  recycleItems(
    nextContext: ResourceBaseContext<Response, Query, Options, MetaType>,
    prevContext: ResourceBaseContext<Response, Query, Options, MetaType>,
  ): Response {
    if (nextContext.data == null || prevContext.data == null)
      return nextContext.data;
    const nextItems = Array.isArray(nextContext.data)
      ? (nextContext.data as Item[])
      : [nextContext.data as Item];
    const prevItems = Array.isArray(prevContext.data)
      ? (prevContext.data as Item[])
      : [prevContext.data as Item];
    const prevMapping: { [id: string]: Item } = {};
    if (nextItems.length > 0) {
      prevItems.forEach((item) => {
        const id = this.getItemIdentifier(item);
        if (id != null) prevMapping[id] = item;
      });
    }
    let result: Item[];
    if (prevItems.length > 0) {
      result = nextItems.map((nextItem) => {
        const id = this.getItemIdentifier(nextItem);
        if (
          id != null &&
          Object.prototype.hasOwnProperty.call(prevMapping, id)
        ) {
          const prevItem = prevMapping[id];
          if (this.compareItemVersions(nextItem, prevItem)) return prevItem;
        }
        return nextItem;
      });
    } else {
      result = nextItems;
    }
    if (!Array.isArray(nextContext.data)) {
      return result[0] as Response;
    }
    if (
      prevItems.length === result.length &&
      result.reduce(
        (sum, item, i) => sum && Object.is(prevItems[i], item),
        true,
      )
    ) {
      return prevItems as Response;
    }
    return result as Response;
  }
}

export const isDataProvider = (dataProvider: unknown): boolean =>
  dataProvider instanceof DataProvider;

export type DataProviderImplementation<
  DataProviderI extends GenericDataProvider,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ConstructorArgs extends any[],
> = Constructor<
  ConstructorArgs,
  DataProviderI & {
    handleGet(
      resource: string,
      query: InferQuery<DataProviderI>,
      options: InferOptions<DataProviderI> | undefined,
      meta: InferMetaType<DataProviderI>,
      abortSignal: AbortSignalProxy,
    ):
      | Promise<
          | InferResponse<DataProviderI>
          | ContinuousGet<InferResponse<DataProviderI>>
        >
      | InferResponse<DataProviderI>
      | ContinuousGet<InferResponse<DataProviderI>>;
  }
>;

export type GenericDataProvider = DataProvider<
  unknown,
  unknown,
  unknown,
  Meta,
  unknown,
  unknown,
  unknown,
  unknown,
  unknown
>;

export type GenericDataProviderImplementation = DataProviderImplementation<
  GenericDataProvider,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any[]
>;

export type InferItem<DataProviderI extends GenericDataProvider> =
  DataProviderI['_inferItem'];

export type InferQuery<DataProviderI extends GenericDataProvider> =
  DataProviderI['_inferQuery'];

export type InferOptions<DataProviderI extends GenericDataProvider> =
  DataProviderI['_inferOptions'];

export type InferMetaType<DataProviderI extends GenericDataProvider> =
  DataProviderI['_inferMetaType'];

export type InferResponse<DataProviderI extends GenericDataProvider> =
  DataProviderI['_inferResponse'];

export type InferContextPluginProps<DataProviderI extends GenericDataProvider> =
  DataProviderI['_inferContextPluginProps'];

export type InferContextPluginTypes<DataProviderI extends GenericDataProvider> =
  DataProviderI['_inferContextPluginTypes'];

export type InferUIPluginProps<DataProviderI extends GenericDataProvider> =
  DataProviderI['_inferUIPluginProps'];

export type InferUIPluginTypes<DataProviderI extends GenericDataProvider> =
  DataProviderI['_inferUIPluginTypes'];
