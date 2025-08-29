import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
} from 'react';
import AbortSignal from './AbortSignal';
import type {
  GenericDataProvider,
  InferInstance,
  InferItem,
  InferOptions,
  InferQuery,
  Persistence,
  RequestDetails,
  ResourceBaseContext,
  ResourceContextValue,
} from './DataProvider';
import Meta from './Meta';
import { useConfigContext } from './context';
import uniqueIdentifier from './uniqueIdentifier';

type BaseState<
  DataProviderI extends GenericDataProvider,
  ItemI extends InferItem<DataProviderI> = InferItem<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
> = {
  dataProvider: DataProviderI;
  requestDetails: RequestDetails<QueryI, OptionsI>;
  request: string;
  revision: string;
  isLoading: boolean;
  value: ResourceBaseContext<ItemI, QueryI, OptionsI>;
  persistent: Persistence;
};

type RequestInstruction<
  DataProviderI extends GenericDataProvider,
  ItemI extends InferItem<DataProviderI> = InferItem<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
> = {
  dataProvider: DataProviderI;
  requestDetails: RequestDetails<QueryI, OptionsI>;
  request: string;
  revision: string;
  value: ResourceBaseContext<ItemI, QueryI, OptionsI>;
};

type State<
  DataProviderI extends GenericDataProvider,
  ItemI extends InferItem<DataProviderI> = InferItem<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
> = BaseState<DataProviderI, ItemI, QueryI, OptionsI> & {
  requestInstruction: RequestInstruction<
    DataProviderI,
    ItemI,
    QueryI,
    OptionsI
  >;
};

/**
 * Appends a new requestInstruction to the state, causing the resource to fetch data.
 **/
function createRequestInstruction<
  DataProviderI extends GenericDataProvider,
  ItemI extends InferItem<DataProviderI> = InferItem<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
>(
  state:
    | BaseState<DataProviderI, ItemI, QueryI, OptionsI>
    | State<DataProviderI, ItemI, QueryI, OptionsI>,
): State<DataProviderI, ItemI, QueryI, OptionsI> {
  return {
    ...state,
    requestInstruction: {
      dataProvider: state.dataProvider,
      requestDetails: state.requestDetails,
      request: state.request,
      revision: state.revision,
      value: state.value,
    },
  };
}

type Action<
  DataProviderI extends GenericDataProvider,
  ItemI extends InferItem<DataProviderI> = InferItem<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
> =
  | {
      type: 'next-request';
      requestDetails: RequestDetails<QueryI, OptionsI>;
      persistent: Persistence;
    }
  | {
      type: 'next-revision';
      notify: (next: { request: string; revision: string }) => void;
    }
  | {
      type: 'set-persistence';
      persistent: Persistence;
    }
  | {
      type: 'update-data';
      request: string;
      revision: string;
      value: ResourceBaseContext<ItemI, QueryI, OptionsI>;
    };

/**
 * State reducer for the resource.
 */
function reducer<
  DataProviderI extends GenericDataProvider,
  ItemI extends InferItem<DataProviderI> = InferItem<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
>(
  state: State<DataProviderI, ItemI, QueryI, OptionsI>,
  action: Action<DataProviderI, ItemI, QueryI, OptionsI>,
): State<DataProviderI, ItemI, QueryI, OptionsI> {
  switch (action.type) {
    // Creates a new request and instructs the resource to fetch data.
    case 'next-request': {
      const { requestDetails: nextRequestDetails, persistent: nextPersistent } =
        action;
      const nextRequest = uniqueIdentifier(state.request);
      const nextRevision = uniqueIdentifier(state.revision);
      let isPersistent: Persistence = false;
      if (state.persistent === 'very' && nextPersistent === 'very') {
        isPersistent = 'very';
      } else if (state.persistent && nextPersistent) {
        isPersistent = true;
      }
      const shouldValuePersist =
        !nextRequestDetails.empty &&
        state.dataProvider.shouldPersist(
          nextRequestDetails,
          state.requestDetails,
          isPersistent,
          state.value,
        );
      return createRequestInstruction<DataProviderI, ItemI, QueryI, OptionsI>({
        dataProvider: state.dataProvider,
        requestDetails: nextRequestDetails,
        request: nextRequest,
        revision: nextRevision,
        isLoading: !nextRequestDetails.empty,
        value: shouldValuePersist
          ? state.value
          : {
              name: nextRequestDetails.name,
              query: nextRequestDetails.query,
              options: nextRequestDetails.options,
              request: nextRequest,
              revision: nextRevision,
              data: [],
              meta: {},
              error: undefined,
              isEmpty: !!nextRequestDetails.empty,
              isIncomplete: !nextRequestDetails.empty,
              isInitial: !nextRequestDetails.empty,
            },
        persistent: nextPersistent,
      });
    }

    // Creates a new revision for the current request and instructs the resource to fetch data.
    case 'next-revision': {
      const { notify } = action;
      const nextRevision = uniqueIdentifier(state.revision);
      notify({ request: state.request, revision: nextRevision });
      return createRequestInstruction<DataProviderI, ItemI, QueryI, OptionsI>({
        ...state,
        revision: nextRevision,
        isLoading: !state.requestDetails.empty,
      });
    }

    // Sets a new persistence level.
    case 'set-persistence': {
      const { persistent: nextPersistent } = action;
      return {
        ...state,
        persistent: nextPersistent,
      };
    }

    // Updates the current request's data.
    case 'update-data': {
      const { request, revision, value } = action;
      if (request !== state.request || revision !== state.revision) {
        return state;
      }
      return {
        ...state,
        isLoading: value.isIncomplete,
        value,
      };
    }
  }

  return state;
}

/**
 * Starts fetching data and updates the resource when new data is available.
 */
function fetchData<
  DataProviderI extends GenericDataProvider,
  ItemI extends InferItem<DataProviderI> = InferItem<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
>(
  requestInstruction: RequestInstruction<
    DataProviderI,
    ItemI,
    QueryI,
    OptionsI
  >,
  instance: InferInstance<DataProviderI>,
  abortSignal: AbortSignal,
  dispatch: Dispatch<Action<DataProviderI, ItemI, QueryI, OptionsI>>,
): void {
  const { dataProvider, requestDetails, request, revision, value } =
    requestInstruction;

  const meta = new Meta({ ...value.meta }, instance);

  let promise: Promise<ResourceBaseContext<ItemI, QueryI, OptionsI>> =
    Promise.resolve(value);

  const callback = (
    error: Error | undefined,
    done: boolean,
    data: ItemI[],
  ): void => {
    promise = promise.then((prevValue) => {
      try {
        let nextValue;
        if (error != null) {
          nextValue = {
            ...prevValue,
            error,
            isIncomplete: false,
          };
        } else {
          const context = {
            name: requestDetails.name,
            query: requestDetails.query,
            options: requestDetails.options,
            request,
            revision,
            data,
            meta: meta.commit(prevValue.meta),
            error: undefined,
            isEmpty: false,
            isIncomplete: !done,
            isInitial: !!prevValue.isInitial && !done,
          };
          context.data = dataProvider.transition(context, prevValue) as ItemI[];
          context.data = dataProvider.recycleItems(
            context,
            prevValue,
          ) as ItemI[];
          nextValue = context;
        }

        dispatch({ type: 'update-data', request, revision, value: nextValue });

        return nextValue;
      } catch {
        return prevValue;
      }
    });
  };

  dataProvider.continuousGet<ItemI, QueryI, OptionsI>(
    requestDetails.name,
    requestDetails.query,
    requestDetails.options,
    meta,
    callback,
    abortSignal,
  );
}

/**
 * Provides data based on the given request details and DataProvider.
 *
 * Necessary configuration that is not directly specified is taken from the ConfigContext.
 *
 * The provided DataProvider must not be changed.
 */
export default function useResource<
  DataProviderI extends GenericDataProvider,
  ItemI extends InferItem<DataProviderI> = InferItem<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
>({
  /** DataProvider to be used for requests - must not be changed */
  dataProvider: dataProviderProp,
  /** Resource name */
  name: nextName,
  /** Query instructions */
  query: nextQuery,
  /** Disables fetching data, resulting in an empty data array */
  empty: nextEmpty,
  /** Query options for requests */
  options: nextOptions,
  /** Whether stale data should be retained during the next request - this only applies if name did not change, unless set to "very" */
  persistent: nextPersistent,
  ...rest
}: {
  dataProvider?: DataProviderI;
  name: string;
  query: QueryI;
  empty?: boolean;
  options?: OptionsI;
  persistent?: Persistence;
  [rest: string]: unknown;
}): ResourceContextValue<DataProviderI, ItemI, QueryI, OptionsI> {
  const configContext = useConfigContext<DataProviderI>();
  const currentDataProvider = dataProviderProp || configContext.dataProvider!;

  const nextRequestDetails = useMemo<RequestDetails<QueryI, OptionsI>>(
    () => ({
      name: nextName,
      query: nextQuery,
      empty: !!nextEmpty,
      options: nextOptions,
    }),
    [nextName, nextQuery, nextEmpty, nextOptions],
  );
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const request = uniqueIdentifier();
    const revision = uniqueIdentifier();
    return createRequestInstruction<DataProviderI, ItemI, QueryI, OptionsI>({
      dataProvider: currentDataProvider,
      requestDetails: nextRequestDetails,
      request,
      revision,
      isLoading: !nextRequestDetails.empty,
      value: {
        name: nextRequestDetails.name,
        query: nextRequestDetails.query,
        options: nextRequestDetails.options,
        request,
        revision,
        data: [],
        meta: {},
        error: undefined,
        isEmpty: !!nextRequestDetails.empty,
        isIncomplete: !nextRequestDetails.empty,
        isInitial: !nextRequestDetails.empty,
      },
      persistent: nextPersistent ?? false,
    });
  });
  const {
    dataProvider,
    requestDetails,
    request,
    revision,
    isLoading,
    value,
    persistent,
    requestInstruction,
  } = state;

  if (dataProvider == null) {
    throw new Error(
      'Unmet requirement: The DataProvider for the useResource hook is missing - Check your ConfigContext provider and the dataProvider property',
    );
  }
  if (dataProvider !== currentDataProvider) {
    throw new Error(
      'Constant violation: The DataProvider provided to the useResource hook must not be replaced - Check your ConfigContext provider and the dataProvider property',
    );
  }

  const [instance, setInstance] = useState<InferInstance<DataProviderI>>();
  useEffect(() => {
    const i = (dataProvider.createInstance() ??
      {}) as InferInstance<DataProviderI>;
    setInstance(i);
    return () => {
      dataProvider.releaseInstance(i);
    };
  }, [dataProvider]);

  if (
    requestDetails !== nextRequestDetails &&
    !dataProvider.compareRequests(nextRequestDetails, requestDetails)
  ) {
    dispatch({
      type: 'next-request',
      requestDetails: nextRequestDetails,
      persistent: nextPersistent ?? false,
    });
  } else if (persistent !== (nextPersistent ?? false)) {
    dispatch({ type: 'set-persistence', persistent: nextPersistent ?? false });
  }

  const notify = useCallback(
    async () =>
      new Promise<{ request: string; revision: string }>((resolve) => {
        dispatch({ type: 'next-revision', notify: resolve });
      }),
    [],
  );

  // DataProvider events
  useEffect(() => {
    if (requestDetails.empty) return undefined;

    const unsubscribe = dataProvider.subscribe(requestDetails.name, notify);
    return unsubscribe;
  }, [requestDetails.empty, dataProvider, requestDetails.name, notify]);

  // Fetch data when instructed
  useEffect(() => {
    if (instance == null || requestInstruction.requestDetails.empty) {
      return undefined;
    }

    const abortSignal = new AbortSignal();

    // Start fetching data.
    fetchData<DataProviderI, ItemI, QueryI, OptionsI>(
      requestInstruction,
      instance,
      abortSignal,
      dispatch,
    );

    return () => {
      // Abort fetching data when another request is pending or the React component is unmounted.
      abortSignal.abort();
    };
  }, [instance, requestInstruction]);

  const isStale = revision !== value.revision;
  const nextRequest = isStale ? request : value.request;
  const nextRevision = isStale ? revision : value.revision;
  const next = useMemo(
    () => ({ request: nextRequest, revision: nextRevision }),
    [nextRequest, nextRevision],
  );
  const context = useMemo(
    () => ({ ...value, dataProvider, isLoading, isStale, next, notify }),
    [value, dataProvider, isLoading, isStale, next, notify],
  );

  // Apply context plugins and return the final context.
  return dataProvider.contextPlugins.reduce(
    (result, fn) => fn(result, rest),
    context as ResourceContextValue<GenericDataProvider>,
  ) as ResourceContextValue<DataProviderI, ItemI, QueryI, OptionsI>;
}
