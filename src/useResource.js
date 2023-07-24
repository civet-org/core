import React from 'react';

import AbortSignal from './AbortSignal';
import Meta from './Meta';
import { useConfigContext } from './context';
import uniqueIdentifier from './uniqueIdentifier';

/**
 * Makes data from an DataProvider available.
 * If not explicitly specified, necessary configuration is taken from the nearest <ConfigProvider>.
 * The provided DataProvider must not be replaced.
 */
function useResource({
  dataProvider: dataProviderProp,
  name: nextName,
  query: nextQuery,
  empty: nextEmpty,
  options: nextOptions,
  persistent: nextPersistent,
  ...rest
}) {
  const configContext = useConfigContext();
  const currentDataProvider = dataProviderProp || configContext.dataProvider;
  const [dataProvider] = React.useState(currentDataProvider);
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

  const [instance, setInstance] = React.useState();
  React.useEffect(() => {
    const i = dataProvider.createInstance();
    setInstance(i);
    return () => {
      dataProvider.releaseInstance(i);
    };
  }, []);

  const nextRequestDetails = React.useMemo(
    () => ({ name: nextName, query: nextQuery, empty: nextEmpty, options: nextOptions }),
    [nextName, nextQuery, nextEmpty, nextOptions],
  );
  const [state, setState] = React.useState(() => {
    const request = uniqueIdentifier();
    const revision = uniqueIdentifier();
    return {
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
      persistent: nextPersistent,
    };
  });
  const { requestDetails, request, revision, isLoading, value, persistent } = state;

  if (
    requestDetails !== nextRequestDetails &&
    !dataProvider.compareRequests(nextRequestDetails, requestDetails)
  ) {
    setState((prevState) => {
      const nextRequest = uniqueIdentifier(prevState.request);
      const nextRevision = uniqueIdentifier(prevState.revision);
      let isPersistent = false;
      if (prevState.persistent === 'very' && nextPersistent === 'very') {
        isPersistent = 'very';
      } else if (prevState.persistent && nextPersistent) {
        isPersistent = true;
      }
      const shouldValuePersist =
        !nextRequestDetails.empty &&
        dataProvider.shouldPersist(
          nextRequestDetails,
          prevState.requestDetails,
          isPersistent,
          prevState.value,
        );
      return {
        requestDetails: nextRequestDetails,
        request: nextRequest,
        revision: nextRevision,
        isLoading: !nextRequestDetails.empty,
        value: shouldValuePersist
          ? prevState.value
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
      };
    });
  } else if (persistent !== nextPersistent) {
    setState((prevState) => ({ ...prevState, persistent: nextPersistent }));
  }

  const notify = React.useCallback(
    async () =>
      new Promise((resolve) => {
        setState((currentState) => {
          const nextRevision = uniqueIdentifier(currentState.revision);
          resolve({ request: currentState.request, revision: nextRevision });
          return { ...currentState, isLoading: true, revision: nextRevision };
        });
      }),
    [],
  );

  // DataProvider events
  React.useEffect(() => {
    if (requestDetails.empty) return undefined;

    const unsubscribe = dataProvider.subscribe(requestDetails.name, notify);
    return unsubscribe;
  }, [requestDetails.empty, dataProvider, requestDetails.name, notify]);

  React.useEffect(() => {
    if (requestDetails.empty || instance == null) return undefined;

    const abortSignal = new AbortSignal();

    const meta = new Meta({ ...value.meta }, instance);

    let promise = Promise.resolve(state);

    const callback = (error, done, data) => {
      promise = promise.then((prevState) => {
        try {
          let nextState;

          if (error != null) {
            nextState = {
              ...prevState,
              isLoading: false,
              value: {
                ...prevState.value,
                error,
                isIncomplete: false,
              },
            };
          } else {
            const context = {
              name: requestDetails.name,
              query: requestDetails.query,
              options: requestDetails.options,
              request,
              revision,
              data,
              meta: meta.commit(prevState.value.meta),
              error: undefined,
              isEmpty: false,
              isIncomplete: !done,
              isInitial: !!prevState.isInitial && !done,
            };
            context.data = dataProvider.transition(context, prevState.value);
            context.data = dataProvider.recycleItems(context, prevState.value);

            nextState = {
              ...prevState,
              isLoading: !done,
              value: context,
            };
          }

          setState((otherState) => {
            if (request !== otherState.request || revision !== otherState.revision) {
              return otherState;
            }

            return nextState;
          });

          return nextState;
        } catch {
          return prevState;
        }
      });
    };

    dataProvider.continuousGet(
      requestDetails.name,
      requestDetails.query,
      requestDetails.options,
      meta,
      callback,
      abortSignal,
    );

    return () => {
      abortSignal.abort();
    };
  }, [instance, request, revision]);

  const isStale = revision !== value.revision;
  const next = React.useMemo(
    () => (isStale ? { request, revision } : { request: value.request, revision: value.revision }),
    [isStale, request, revision, value.request, value.revision],
  );
  const context = React.useMemo(
    () => ({ ...value, dataProvider, isLoading, isStale, next, notify }),
    [value, dataProvider, isLoading, isStale, next, notify],
  );

  return dataProvider.contextPlugins.reduce((result, fn) => fn(result, rest), context);
}

export default useResource;
