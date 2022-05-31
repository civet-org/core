import React from 'react';

import AbortSignal from './AbortSignal';
import { useConfigContext } from './context';
import Meta from './Meta';
import uniqueIdentifier from './uniqueIdentifier';

/**
 * Makes data from an DataStore available.
 * If not explicitly specified, necessary configuration is taken from the nearest <ConfigProvider>.
 * The provided DataStore must not be replaced.
 */
function useResource(props) {
  const { name, query, empty, options, dataStore: dataStoreProp, persistent, ...rest } = props;

  const configContext = useConfigContext();
  const currentDataStore = dataStoreProp || configContext.dataStore;
  const dataStore = React.useMemo(() => currentDataStore, []);
  if (dataStore == null) {
    throw new Error(
      'Unmet requirement: The DataStore in the useResource hook is missing. Check your ConfigContext provider and the dataStore property.',
    );
  }
  if (dataStore !== currentDataStore) {
    throw new Error(
      'Constant violation: The DataStore provided to the useResource hook must not be replaced. Check your ConfigContext provider and the dataStore property.',
    );
  }

  const comparator = { name, query, empty, options };
  const [state, setState] = React.useState(() => {
    const request = uniqueIdentifier();
    const revision = uniqueIdentifier();
    return {
      comparator,
      request,
      revision,
      isLoading: !empty,
      value: {
        name,
        query,
        options,
        dataStore,
        request,
        revision,
        data: [],
        meta: {},
        error: undefined,
        isEmpty: empty,
        isIncomplete: !empty,
        isInitial: !empty,
      },
      persistent,
    };
  });
  const {
    comparator: prevComparator,
    request,
    revision,
    isLoading,
    value,
    persistent: prevPersistent,
  } = state;

  if (prevComparator !== comparator && !dataStore.compareRequests(prevComparator, comparator)) {
    setState((prevState) => {
      const nextRequest = uniqueIdentifier(prevState.request);
      const nextRevision = uniqueIdentifier(prevState.revision);
      let isPersistent;
      if (
        prevState.value.meta.persistent === 'very' ||
        (persistent === 'very' && prevState.persistent === 'very')
      ) {
        isPersistent = 'very';
      } else if (prevState.value.meta.persistent || (persistent && prevState.persistent)) {
        isPersistent = true;
      }
      const shouldValuePersist =
        !empty &&
        isPersistent &&
        (isPersistent === 'very' || prevState.comparator.name === comparator.name);
      return {
        comparator,
        request: nextRequest,
        revision: nextRevision,
        isLoading: !empty,
        value: shouldValuePersist
          ? prevState.value
          : {
              name,
              query,
              options,
              request: nextRequest,
              revision: nextRevision,
              data: [],
              meta: {},
              error: undefined,
              isEmpty: empty,
              isIncomplete: !empty,
              isInitial: !empty,
            },
        persistent,
      };
    });
  } else if (prevPersistent !== persistent) {
    setState((prevState) => ({ ...prevState, persistent }));
  }

  const notify = React.useCallback(
    async () =>
      new Promise((resolve) => {
        setState((currentState) => {
          if (currentState.empty) return currentState;
          const nextRevision = uniqueIdentifier(currentState.revision);
          resolve({ request: currentState.request, revision: nextRevision });
          return { ...currentState, isLoading: true, revision: nextRevision };
        });
      }),
    [],
  );

  // DataStore events
  React.useEffect(() => {
    if (empty) return undefined;

    const unsubscribe = dataStore.subscribe(name, notify);
    return unsubscribe;
  }, [!empty, dataStore, name, notify]);

  React.useEffect(() => {
    if (empty) return undefined;

    const abortSignal = new AbortSignal();

    const meta = new Meta({ ...value.meta });

    const callback = (error, done, data) => {
      setState((prevState) => {
        if (request !== prevState.request || revision !== prevState.revision) return prevState;

        if (error != null) {
          return {
            ...prevState,
            isLoading: false,
            value: {
              ...prevState.value,
              error,
              isIncomplete: false,
            },
          };
        }

        const { data: prevData, ...prevContext } = prevState.value;
        const context = {
          name,
          query,
          options,
          request,
          revision,
          meta: meta.commit(prevContext.meta),
          error: undefined,
          isEmpty: false,
          isIncomplete: !done,
          isInitial: prevState.isInitial && !done,
        };

        return {
          isLoading: !done,
          value: {
            ...context,
            data: dataStore.recycleItems(
              dataStore.transition(data, prevData, context, prevContext),
              prevData,
              context,
              prevContext,
            ),
          },
        };
      });
    };

    dataStore.continuousGet(name, query, options, meta, callback, abortSignal);

    return () => {
      abortSignal.abort();
    };
  }, [request, revision]);

  const isStale = request !== value.request;
  const context = React.useMemo(
    () => ({ ...value, isLoading, isStale, notify }),
    [value, isLoading, isStale, notify],
  );

  const contextPlugins = Array.isArray(dataStore.contextPlugins) ? dataStore.contextPlugins : [];
  return contextPlugins.reduce((result, fn) => fn(result, rest), context);
}

export default useResource;
