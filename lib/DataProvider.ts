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
  empty: boolean;
  options: Options | undefined;
};

export type ResourceBaseContext<
  GetResult,
  Query,
  Options,
  MetaType extends Meta,
> = {
  name: string;
  query: Query;
  options: Options | undefined;
  request: string;
  revision: string;
  data: GetResult;
  meta: InferSchema<MetaType>;
  error: Error | undefined;
  isEmpty: boolean;
  isIncomplete: boolean;
  isInitial: boolean;
};

export type ResourceContextValue<
  DataProviderI extends GenericDataProvider,
  GetResultI extends InferGetResult<DataProviderI> =
    InferGetResult<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
  MetaTypeI extends InferMetaType<DataProviderI> = InferMetaType<DataProviderI>,
> = ResourceBaseContext<GetResultI, QueryI, OptionsI, MetaTypeI> & {
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

export interface GetCallback<GetResult> {
  (error: undefined, done: boolean, result: GetResult): void;
  (error: Error, done: boolean, result: undefined): void;
}

export type ContinuousGet<GetResult> = (
  callback: GetCallback<GetResult>,
  /** @deprecated Use the `abortSignal` that is provided by `handleGet` instead. */
  abortSignal: AbortSignalProxy,
) => void;

export default abstract class DataProvider<
  Item,
  Query,
  Options,
  MetaType extends Meta = Meta,
  GetResult extends Item | Item[] = Item | Item[],
  CreateData = Item,
  CreateResult = void,
  UpdateData = Item,
  UpdateResult = void,
  PatchData = Partial<Item>,
  PatchResult = void,
  RemoveResult = void,
> {
  readonly _inferItem!: Item;
  readonly _inferQuery!: Query;
  readonly _inferOptions!: Options;
  readonly _inferMetaType!: MetaType;
  readonly _inferGetResult!: GetResult;
  readonly _inferCreateData!: CreateData;
  readonly _inferCreateResult!: CreateResult;
  readonly _inferUpdateData!: UpdateData;
  readonly _inferUpdateResult!: UpdateResult;
  readonly _inferPatchData!: PatchData;
  readonly _inferPatchResult!: PatchResult;
  readonly _inferRemoveResult!: RemoveResult;

  notifier = new ChannelNotifier();
  readonly contextPlugins: ContextPlugin<unknown, unknown>[] = [];
  readonly uiPlugins: UIPlugin<unknown, unknown>[] = [];

  constructor() {
    const contextPlugins: ContextPlugin<unknown, unknown>[] = [];
    const uiPlugins: UIPlugin<unknown, unknown>[] = [];
    this.extend({
      context: (plugin) => {
        const plugins = contextPlugins;
        if (plugin != null && !plugins.includes(plugin)) plugins.push(plugin);
      },
      ui: (plugin) => {
        const plugins = uiPlugins;
        if (plugin != null && !plugins.includes(plugin)) plugins.push(plugin);
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

  extend(_extend: {
    context: (plugin: ContextPlugin<unknown, unknown>) => void;
    ui: (plugin: UIPlugin<unknown, unknown>) => void;
  }): void {}

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
    GetResultI extends GetResult = GetResult,
    QueryI extends Query = Query,
    OptionsI extends Options = Options,
    MetaTypeI extends MetaType = MetaType,
  >(
    resource: string,
    query: QueryI,
    options?: OptionsI,
    meta?: MetaLike<MetaTypeI>,
    abortSignal?: AbortSignal,
  ): Promise<GetResultI> {
    return new Promise((resolve, reject) =>
      this.continuousGet<GetResultI, QueryI, OptionsI, MetaTypeI>(
        resource,
        query,
        options,
        meta,
        (
          error: Error | undefined,
          done: boolean,
          result: GetResultI | undefined,
        ) => {
          if (error != null) {
            reject(error);
            return;
          }
          if (done) resolve(result!);
        },
        abortSignal,
      ),
    );
  }

  continuousGet<
    GetResultI extends GetResult = GetResult,
    QueryI extends Query = Query,
    OptionsI extends Options = Options,
    MetaTypeI extends MetaType = MetaType,
  >(
    resource: string,
    query: QueryI,
    options: OptionsI | undefined,
    meta: MetaLike<MetaTypeI> | undefined,
    callback: GetCallback<GetResultI>,
    abortSignal?: AbortSignal,
  ): void {
    const signal = abortSignal == null ? new AbortSignal() : abortSignal;

    new Promise((resolve) => {
      if (resource == null) throw new Error('No resource name specified');

      // result transformation
      const cb = (
        error: Error | undefined,
        done: boolean,
        result: GetResultI | undefined,
      ): void => {
        // prevent updates after completion
        if (signal.locked) return;
        if (error != null || done) {
          signal.lock();
        }
        if (error != null) callback(error, true, undefined);
        else callback(undefined, done, result!);
      };

      const proxy = signal.proxy();

      resolve(
        Promise.resolve(
          this.handleGet(resource, query, options, getMeta(meta), proxy) as
            | Promise<GetResultI | ContinuousGet<GetResultI>>
            | GetResultI
            | ContinuousGet<GetResultI>,
        ).then((result) => {
          if (typeof result === 'function') {
            // DEPRECATED!! `proxy` is being passed down here for backwards compatibility only.
            (result as ContinuousGet<GetResultI>)(cb, proxy);
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
    | Promise<GetResult | ContinuousGet<GetResult>>
    | GetResult
    | ContinuousGet<GetResult>;

  create<
    CreateResultI extends CreateResult = CreateResult,
    CreateDataI extends CreateData = CreateData,
    OptionsI extends Options = Options,
    MetaTypeI extends MetaType = MetaType,
  >(
    resource: string,
    data: CreateDataI,
    options?: OptionsI,
    meta?: MetaLike<MetaTypeI>,
  ): Promise<CreateResultI> {
    return new Promise((resolve) => {
      if (resource == null) throw new Error('No resource name specified');
      if (data == null) throw new Error('No data specified');
      resolve(
        Promise.resolve(
          this.handleCreate(resource, data, options, getMeta(meta)) as
            | Promise<CreateResultI>
            | CreateResultI,
        ),
      );
    });
  }

  abstract handleCreate(
    resource: string,
    data: CreateData,
    options: Options | undefined,
    meta: MetaType,
  ): Promise<CreateResult> | CreateResult;

  update<
    UpdateResultI extends UpdateResult = UpdateResult,
    QueryI extends Query = Query,
    UpdateDataI extends UpdateData = UpdateData,
    OptionsI extends Options = Options,
    MetaTypeI extends MetaType = MetaType,
  >(
    resource: string,
    query: QueryI,
    data: UpdateDataI,
    options?: OptionsI,
    meta?: MetaLike<MetaTypeI>,
  ): Promise<UpdateResultI> {
    return new Promise((resolve) => {
      if (resource == null) throw new Error('No resource name specified');
      if (data == null) throw new Error('No data specified');
      resolve(
        Promise.resolve(
          this.handleUpdate(resource, query, data, options, getMeta(meta)) as
            | Promise<UpdateResultI>
            | UpdateResultI,
        ),
      );
    });
  }

  abstract handleUpdate(
    resource: string,
    query: Query,
    data: UpdateData,
    options: Options | undefined,
    meta: MetaType,
  ): Promise<UpdateResult> | UpdateResult;

  patch<
    PatchResultI extends PatchResult = PatchResult,
    QueryI extends Query = Query,
    PatchDataI extends PatchData = PatchData,
    OptionsI extends Options = Options,
    MetaTypeI extends MetaType = MetaType,
  >(
    resource: string,
    query: QueryI,
    data: PatchDataI,
    options?: OptionsI,
    meta?: MetaLike<MetaTypeI>,
  ): Promise<PatchResultI> {
    return new Promise((resolve) => {
      if (resource == null) throw new Error('No resource name specified');
      if (data == null) throw new Error('No data specified');
      resolve(
        Promise.resolve(
          this.handlePatch(resource, query, data, options, getMeta(meta)) as
            | Promise<PatchResultI>
            | PatchResultI,
        ),
      );
    });
  }

  abstract handlePatch(
    resource: string,
    query: Query,
    data: PatchData,
    options: Options | undefined,
    meta: MetaType,
  ): Promise<PatchResult> | PatchResult;

  remove<
    RemoveResultI extends RemoveResult = RemoveResult,
    QueryI extends Query = Query,
    OptionsI extends Options = Options,
    MetaTypeI extends MetaType = MetaType,
  >(
    resource: string,
    query: QueryI,
    options?: OptionsI,
    meta?: MetaLike<MetaTypeI>,
  ): Promise<RemoveResultI> {
    return new Promise((resolve) => {
      if (resource == null) throw new Error('No resource name specified');
      resolve(
        Promise.resolve(
          this.handleRemove(resource, query, options, getMeta(meta)) as
            | Promise<RemoveResultI>
            | RemoveResultI,
        ),
      );
    });
  }

  abstract handleRemove(
    resource: string,
    query: Query,
    options: Options | undefined,
    meta: MetaType,
  ): Promise<RemoveResult> | RemoveResult;

  compareRequests(
    nextRequestDetails: RequestDetails<Query, Options>,
    prevRequestDetails: RequestDetails<Query, Options>,
  ): boolean {
    return deepEquals(nextRequestDetails, prevRequestDetails);
  }

  getEmptyResponse(_requestDetails: RequestDetails<Query, Options>): GetResult {
    return undefined as GetResult;
  }

  shouldPersist(
    nextRequestDetails: RequestDetails<Query, Options>,
    prevRequestDetails: RequestDetails<Query, Options>,
    persistent: Persistence,
    _context: ResourceBaseContext<GetResult, Query, Options, MetaType>,
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
    nextContext: ResourceBaseContext<GetResult, Query, Options, MetaType>,
    _prevContext: ResourceBaseContext<GetResult, Query, Options, MetaType>,
  ): GetResult {
    return nextContext.data;
  }

  recycleItems(
    nextContext: ResourceBaseContext<GetResult, Query, Options, MetaType>,
    prevContext: ResourceBaseContext<GetResult, Query, Options, MetaType>,
  ): GetResult {
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
      return result[0] as GetResult;
    }
    if (
      prevItems.length === result.length &&
      result.reduce(
        (sum, item, i) => sum && Object.is(prevItems[i], item),
        true,
      )
    ) {
      return prevItems as GetResult;
    }
    return result as GetResult;
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
          | InferGetResult<DataProviderI>
          | ContinuousGet<InferGetResult<DataProviderI>>
        >
      | InferGetResult<DataProviderI>
      | ContinuousGet<InferGetResult<DataProviderI>>;

    handleCreate(
      resource: string,
      data: InferCreateData<DataProviderI>,
      options: InferOptions<DataProviderI> | undefined,
      meta: InferMetaType<DataProviderI>,
    ):
      | Promise<InferCreateResult<DataProviderI>>
      | InferCreateResult<DataProviderI>;

    handleUpdate(
      resource: string,
      query: InferQuery<DataProviderI>,
      data: InferUpdateData<DataProviderI>,
      options: InferOptions<DataProviderI> | undefined,
      meta: InferMetaType<DataProviderI>,
    ):
      | Promise<InferUpdateResult<DataProviderI>>
      | InferUpdateResult<DataProviderI>;

    handlePatch(
      resource: string,
      query: InferQuery<DataProviderI>,
      data: InferPatchData<DataProviderI>,
      options: InferOptions<DataProviderI> | undefined,
      meta: InferMetaType<DataProviderI>,
    ):
      | Promise<InferPatchResult<DataProviderI>>
      | InferPatchResult<DataProviderI>;

    handleRemove(
      resource: string,
      query: InferQuery<DataProviderI>,
      options: InferOptions<DataProviderI> | undefined,
      meta: InferMetaType<DataProviderI>,
    ):
      | Promise<InferRemoveResult<DataProviderI>>
      | InferRemoveResult<DataProviderI>;
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

export type InferGetResult<DataProviderI extends GenericDataProvider> =
  DataProviderI['_inferGetResult'];

export type InferCreateData<DataProviderI extends GenericDataProvider> =
  DataProviderI['_inferCreateData'];

export type InferCreateResult<DataProviderI extends GenericDataProvider> =
  DataProviderI['_inferCreateResult'];

export type InferUpdateData<DataProviderI extends GenericDataProvider> =
  DataProviderI['_inferUpdateData'];

export type InferUpdateResult<DataProviderI extends GenericDataProvider> =
  DataProviderI['_inferUpdateResult'];

export type InferPatchData<DataProviderI extends GenericDataProvider> =
  DataProviderI['_inferPatchData'];

export type InferPatchResult<DataProviderI extends GenericDataProvider> =
  DataProviderI['_inferPatchResult'];

export type InferRemoveResult<DataProviderI extends GenericDataProvider> =
  DataProviderI['_inferRemoveResult'];
