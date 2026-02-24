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
  InferResponse,
  InferMetaType,
  InferOptions,
  InferQuery,
  Persistence,
  RequestDetails,
  ResourceBaseContext,
  ResourceContextValue,
  InferContextPluginProps,
  InferContextPluginTypes,
} from './DataProvider';
import Meta, { type InferInstance } from './Meta';
import { useConfigContext } from './context';
import uniqueIdentifier from './uniqueIdentifier';

type BaseState<
  DataProviderI extends GenericDataProvider,
  ResponseI extends InferResponse<DataProviderI> = InferResponse<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
  MetaTypeI extends InferMetaType<DataProviderI> = InferMetaType<DataProviderI>,
> = {
  dataProvider: DataProviderI;
  requestDetails: RequestDetails<QueryI, OptionsI>;
  request: string;
  revision: string;
  isLoading: boolean;
  value: ResourceBaseContext<ResponseI, QueryI, OptionsI, MetaTypeI>;
  persistent: Persistence;
};

type RequestInstruction<
  DataProviderI extends GenericDataProvider,
  ResponseI extends InferResponse<DataProviderI> = InferResponse<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
  MetaTypeI extends InferMetaType<DataProviderI> = InferMetaType<DataProviderI>,
> = {
  dataProvider: DataProviderI;
  requestDetails: RequestDetails<QueryI, OptionsI>;
  request: string;
  revision: string;
  value: ResourceBaseContext<ResponseI, QueryI, OptionsI, MetaTypeI>;
};

type State<
  DataProviderI extends GenericDataProvider,
  ResponseI extends InferResponse<DataProviderI> = InferResponse<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
  MetaTypeI extends InferMetaType<DataProviderI> = InferMetaType<DataProviderI>,
> = BaseState<DataProviderI, ResponseI, QueryI, OptionsI, MetaTypeI> & {
  requestInstruction: RequestInstruction<
    DataProviderI,
    ResponseI,
    QueryI,
    OptionsI,
    MetaTypeI
  >;
};

/**
 * Appends a new requestInstruction to the state, causing the resource to fetch data.
 **/
function createRequestInstruction<
  DataProviderI extends GenericDataProvider,
  ResponseI extends InferResponse<DataProviderI> = InferResponse<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
  MetaTypeI extends InferMetaType<DataProviderI> = InferMetaType<DataProviderI>,
>(
  state:
    | BaseState<DataProviderI, ResponseI, QueryI, OptionsI, MetaTypeI>
    | State<DataProviderI, ResponseI, QueryI, OptionsI, MetaTypeI>,
): State<DataProviderI, ResponseI, QueryI, OptionsI, MetaTypeI> {
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
  ResponseI extends InferResponse<DataProviderI> = InferResponse<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
  MetaTypeI extends InferMetaType<DataProviderI> = InferMetaType<DataProviderI>,
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
      value: ResourceBaseContext<ResponseI, QueryI, OptionsI, MetaTypeI>;
    };

/**
 * State reducer for the resource.
 */
function reducer<
  DataProviderI extends GenericDataProvider,
  ResponseI extends InferResponse<DataProviderI> = InferResponse<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
  MetaTypeI extends InferMetaType<DataProviderI> = InferMetaType<DataProviderI>,
>(
  state: State<DataProviderI, ResponseI, QueryI, OptionsI, MetaTypeI>,
  action: Action<DataProviderI, ResponseI, QueryI, OptionsI, MetaTypeI>,
): State<DataProviderI, ResponseI, QueryI, OptionsI, MetaTypeI> {
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
        !nextRequestDetails.disabled &&
        state.dataProvider.shouldPersist(
          nextRequestDetails,
          state.requestDetails,
          isPersistent,
          state.value,
        );
      return createRequestInstruction<
        DataProviderI,
        ResponseI,
        QueryI,
        OptionsI,
        MetaTypeI
      >({
        dataProvider: state.dataProvider,
        requestDetails: nextRequestDetails,
        request: nextRequest,
        revision: nextRevision,
        isLoading: !nextRequestDetails.disabled,
        value: shouldValuePersist
          ? state.value
          : {
              name: nextRequestDetails.name,
              query: nextRequestDetails.query,
              options: nextRequestDetails.options,
              request: nextRequest,
              revision: nextRevision,
              data: state.dataProvider.createEmptyResponse(
                nextRequestDetails,
              ) as ResponseI,
              meta: {},
              error: undefined,
              isDisabled: !!nextRequestDetails.disabled,
              isIncomplete: !nextRequestDetails.disabled,
              isInitial: !nextRequestDetails.disabled,
            },
        persistent: nextPersistent,
      });
    }

    // Creates a new revision for the current request and instructs the resource to fetch data.
    case 'next-revision': {
      const { notify } = action;
      const nextRevision = uniqueIdentifier(state.revision);
      notify({ request: state.request, revision: nextRevision });
      return createRequestInstruction<
        DataProviderI,
        ResponseI,
        QueryI,
        OptionsI,
        MetaTypeI
      >({
        ...state,
        revision: nextRevision,
        isLoading: !state.requestDetails.disabled,
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
  ResponseI extends InferResponse<DataProviderI> = InferResponse<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
  MetaTypeI extends InferMetaType<DataProviderI> = InferMetaType<DataProviderI>,
>(
  requestInstruction: RequestInstruction<
    DataProviderI,
    ResponseI,
    QueryI,
    OptionsI,
    MetaTypeI
  >,
  instance: InferInstance<InferMetaType<DataProviderI>>,
  abortSignal: AbortSignal,
  dispatch: Dispatch<
    Action<DataProviderI, ResponseI, QueryI, OptionsI, MetaTypeI>
  >,
): void {
  const { dataProvider, requestDetails, request, revision, value } =
    requestInstruction;

  const meta = new Meta({ ...value.meta }, instance) as MetaTypeI;

  let promise: Promise<
    ResourceBaseContext<ResponseI, QueryI, OptionsI, MetaTypeI>
  > = Promise.resolve(value);

  const callback = (
    error: Error | undefined,
    done: boolean,
    data: ResponseI | undefined,
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
          const context: ResourceBaseContext<
            ResponseI,
            QueryI,
            OptionsI,
            MetaTypeI
          > = {
            name: requestDetails.name,
            query: requestDetails.query,
            options: requestDetails.options,
            request,
            revision,
            data: data!,
            meta: meta.commit(prevValue.meta),
            error: undefined,
            isDisabled: false,
            isIncomplete: !done,
            isInitial: !!prevValue.isInitial && !done,
          };
          context.data = dataProvider.transition(
            context,
            prevValue,
          ) as ResponseI;
          context.data = dataProvider.recycleItems(
            context,
            prevValue,
          ) as ResponseI;
          nextValue = context;
        }

        dispatch({ type: 'update-data', request, revision, value: nextValue });

        return nextValue;
      } catch {
        return prevValue;
      }
    });
  };

  dataProvider.continuousGet<ResponseI, QueryI, OptionsI, MetaTypeI>(
    requestDetails.name,
    requestDetails.query,
    requestDetails.options,
    meta,
    callback,
    abortSignal,
  );
}

export type ResourceProps<
  DataProviderI extends GenericDataProvider,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
> = {
  /** DataProvider to be used for requests - must not be changed */
  dataProvider?: DataProviderI;
  /** Resource name */
  name: string;
  /** Query instructions */
  query: QueryI;
  /** Disables fetching data, resulting in an empty data array */
  disabled?: boolean;
  /** Query options for requests */
  options?: OptionsI;
  /** Whether stale data should be retained during the next request - this only applies if name did not change, unless set to "very" */
  persistent?: Persistence;
};

/**
 * Provides data based on the given request details and DataProvider.
 *
 * Necessary configuration that is not directly specified is taken from the ConfigContext.
 *
 * The provided DataProvider must not be changed.
 */
export default function useResource<
  DataProviderI extends GenericDataProvider,
  ResponseI extends InferResponse<DataProviderI> = InferResponse<DataProviderI>,
  QueryI extends InferQuery<DataProviderI> = InferQuery<DataProviderI>,
  OptionsI extends InferOptions<DataProviderI> = InferOptions<DataProviderI>,
  MetaTypeI extends InferMetaType<DataProviderI> = InferMetaType<DataProviderI>,
>({
  dataProvider: dataProviderProp,
  name: nameProp,
  query: nextQuery,
  disabled: nextDisabled,
  options: nextOptions,
  persistent: nextPersistent,
  ...rest
}: ResourceProps<DataProviderI, QueryI, OptionsI> &
  InferContextPluginProps<DataProviderI>): ResourceContextValue<
  DataProviderI,
  ResponseI,
  QueryI,
  OptionsI,
  MetaTypeI
> &
  InferContextPluginTypes<DataProviderI> {
  const configContext = useConfigContext<DataProviderI>();
  const currentDataProvider = dataProviderProp || configContext.dataProvider!;
  const nextName = currentDataProvider?.normalizeResource(nameProp) ?? nameProp;

  const nextRequestDetails = useMemo<RequestDetails<QueryI, OptionsI>>(
    () => ({
      name: nextName,
      query: nextQuery,
      disabled: !!nextDisabled,
      options: nextOptions,
    }),
    [nextName, nextQuery, nextDisabled, nextOptions],
  );
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const request = uniqueIdentifier();
    const revision = uniqueIdentifier();
    return createRequestInstruction<
      DataProviderI,
      ResponseI,
      QueryI,
      OptionsI,
      MetaTypeI
    >({
      dataProvider: currentDataProvider,
      requestDetails: nextRequestDetails,
      request,
      revision,
      isLoading: !nextRequestDetails.disabled,
      value: {
        name: nextRequestDetails.name,
        query: nextRequestDetails.query,
        options: nextRequestDetails.options,
        request,
        revision,
        data: currentDataProvider?.createEmptyResponse(
          nextRequestDetails,
        ) as ResponseI,
        meta: {},
        error: undefined,
        isDisabled: !!nextRequestDetails.disabled,
        isIncomplete: !nextRequestDetails.disabled,
        isInitial: !nextRequestDetails.disabled,
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

  const [instance, setInstance] =
    useState<InferInstance<InferMetaType<DataProviderI>>>();
  useEffect(() => {
    const i = (dataProvider.createInstance() ?? {}) as InferInstance<
      InferMetaType<DataProviderI>
    >;
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (requestDetails.disabled) return undefined;

    const unsubscribe = dataProvider.subscribe(requestDetails.name, notify);
    return unsubscribe;
  }, [requestDetails.disabled, dataProvider, requestDetails.name, notify]);

  // Fetch data when instructed
  useEffect(() => {
    if (instance == null || requestInstruction.requestDetails.disabled) {
      return undefined;
    }

    const abortSignal = new AbortSignal();

    // Start fetching data.
    fetchData<DataProviderI, ResponseI, QueryI, OptionsI, MetaTypeI>(
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
  return dataProvider.contextPlugins.reduce<
    ResourceContextValue<GenericDataProvider>
  >((result, fn) => fn(result, rest), context) as ResourceContextValue<
    DataProviderI,
    ResponseI,
    QueryI,
    OptionsI,
    MetaTypeI
  > &
    InferContextPluginTypes<DataProviderI>;
}
