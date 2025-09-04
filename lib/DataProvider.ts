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

export type ResourceBaseContext<Item, Query, Options, MetaType extends Meta> = {
  name: string;
  query: Query;
  options: Options | undefined;
  request: string;
  revision: string;
  data: Item[];
  meta: InferSchema<MetaType>;
  error: Error | undefined;
  isEmpty: boolean;
  isIncomplete: boolean;
  isInitial: boolean;
};

export type ResourceContextValue<
  DataProviderI extends GenericDataProvider,
  ItemI extends InferItem<DataProviderI> = InferItem<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
  MetaTypeI extends InferMetaType<DataProviderI> = InferMetaType<DataProviderI>,
> = ResourceBaseContext<ItemI, QueryI, OptionsI, MetaTypeI> & {
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

export type GetCallback<Item> = (
  error: Error | undefined,
  done: boolean,
  result: Item[],
) => void;

export type ContinuousGet<Item> = (
  callback: GetCallback<Item>,
  /** @deprecated Use the `abortSignal` that is provided by `handleGet` instead. */
  abortSignal: AbortSignalProxy,
) => void;

export default abstract class DataProvider<
  Item,
  Query,
  Options,
  MetaType extends Meta = Meta,
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
    ItemI extends Item = Item,
    QueryI extends Query = Query,
    OptionsI extends Options = Options,
    MetaTypeI extends MetaType = MetaType,
  >(
    resource: string,
    query: QueryI,
    options?: OptionsI,
    meta?: MetaLike<MetaTypeI>,
    abortSignal?: AbortSignal,
  ): Promise<ItemI[]> {
    return new Promise((resolve, reject) =>
      this.continuousGet<ItemI, QueryI, OptionsI, MetaTypeI>(
        resource,
        query,
        options,
        meta,
        (error, done, result) => {
          if (error != null) {
            reject(error);
            return;
          }
          if (done) resolve(result);
        },
        abortSignal,
      ),
    );
  }

  continuousGet<
    ItemI extends Item = Item,
    QueryI extends Query = Query,
    OptionsI extends Options = Options,
    MetaTypeI extends MetaType = MetaType,
  >(
    resource: string,
    query: QueryI,
    options: OptionsI | undefined,
    meta: MetaLike<MetaTypeI> | undefined,
    callback: GetCallback<ItemI>,
    abortSignal?: AbortSignal,
  ): void {
    const signal = abortSignal == null ? new AbortSignal() : abortSignal;

    new Promise((resolve) => {
      if (resource == null) throw new Error('No resource name specified');

      // result transformation
      const cb = (
        error: Error | undefined,
        done: boolean,
        result: ItemI[],
      ): void => {
        // prevent updates after completion
        if (signal.locked) return;
        if (error != null || done) {
          signal.lock();
        }
        if (error != null) callback(error, true, []);
        else if (result == null) callback(undefined, done, []);
        else if (Array.isArray(result)) callback(undefined, done, result);
        else callback(undefined, done, [result]);
      };

      const proxy = signal.proxy();

      resolve(
        Promise.resolve(
          this.handleGet(resource, query, options, getMeta(meta), proxy) as
            | Promise<ItemI[] | ContinuousGet<ItemI>>
            | ItemI[]
            | ContinuousGet<ItemI>,
        ).then((result) => {
          if (typeof result === 'function') {
            // DEPRECATED!! `proxy` is being passed down here for backwards compatibility only.
            result(cb, proxy);
          } else {
            cb(undefined, true, result);
          }
        }),
      );
    }).catch((e) => {
      if (!signal.locked) callback(e, true, []);
    });
  }

  abstract handleGet(
    resource: string,
    query: Query,
    options: Options | undefined,
    meta: MetaType,
    abortSignal: AbortSignalProxy,
  ): Promise<Item[] | ContinuousGet<Item>> | Item[] | ContinuousGet<Item>;

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

  shouldPersist(
    nextRequestDetails: RequestDetails<Query, Options>,
    prevRequestDetails: RequestDetails<Query, Options>,
    persistent: Persistence,
    _context: ResourceBaseContext<Item, Query, Options, MetaType>,
  ): boolean {
    return (
      persistent === 'very' ||
      (persistent && prevRequestDetails.name === nextRequestDetails.name)
    );
  }

  compareItemVersions(_item1: Item, _item2: Item): boolean {
    return true;
  }

  getItemIdentifier(item: Item): string {
    return objectHash(item as object);
  }

  transition(
    nextContext: ResourceBaseContext<Item, Query, Options, MetaType>,
    _prevContext: ResourceBaseContext<Item, Query, Options, MetaType>,
  ): Item[] {
    return nextContext.data;
  }

  recycleItems(
    nextContext: ResourceBaseContext<Item, Query, Options, MetaType>,
    prevContext: ResourceBaseContext<Item, Query, Options, MetaType>,
  ): Item[] {
    const prevMapping: { [id: string]: Item } = {};
    if (nextContext.data.length > 0) {
      prevContext.data.forEach((item) => {
        const id = this.getItemIdentifier(item);
        if (id != null) prevMapping[id] = item;
      });
    }
    let result: Item[];
    if (prevContext.data.length > 0) {
      result = nextContext.data.map((nextItem) => {
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
      result = nextContext.data;
    }
    if (
      prevContext.data.length === result.length &&
      result.reduce(
        (sum, item, i) => sum && Object.is(prevContext.data[i], item),
        true,
      )
    ) {
      return prevContext.data;
    }
    return result;
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
          InferItem<DataProviderI>[] | ContinuousGet<InferItem<DataProviderI>>
        >
      | InferItem<DataProviderI>[]
      | ContinuousGet<InferItem<DataProviderI>>;

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
