import React from 'react';

import AbortSignal from './AbortSignal';
import { useConfigContext } from './context';
import Meta from './Meta';
import uniqueIdentifier from './uniqueIdentifier';

/**
 * Makes data from an DataProvider available.
 * If not explicitly specified, necessary configuration is taken from the nearest <ConfigProvider>.
 * The provided DataProvider must not be replaced.
 */
function useResource({
  dataProvider: dataProviderProp,
  name,
  query,
  empty,
  options,
  persistent,
  ...rest
}) {
  const configContext = useConfigContext();
  const currentDataProvider = dataProviderProp || configContext.dataProvider;
  const dataProvider = React.useMemo(() => currentDataProvider, []);
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

  if (prevComparator !== comparator && !dataProvider.compareRequests(prevComparator, comparator)) {
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

  // DataProvider events
  React.useEffect(() => {
    if (empty) return undefined;

    const unsubscribe = dataProvider.subscribe(name, notify);
    return unsubscribe;
  }, [!empty, dataProvider, name, notify]);

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
          isInitial: !!prevState.isInitial && !done,
        };

        return {
          ...prevState,
          isLoading: !done,
          value: {
            ...context,
            data: dataProvider.recycleItems(
              dataProvider.transition(data, prevData, context, prevContext),
              prevData,
              context,
              prevContext,
            ),
          },
        };
      });
    };

    dataProvider.continuousGet(name, query, options, meta, callback, abortSignal);

    return () => {
      abortSignal.abort();
    };
  }, [request, revision]);

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
