import deepEquals from 'fast-deep-equal';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import AbortSignal from './AbortSignal';
import { ConfigContext, ResourceContext } from './context';
import { dataStorePropType } from './DataStore';
import Meta from './Meta';
import uniqueIdentifier from './uniqueIdentifier';

function getComparator({ name, ids, query, empty, options }) {
  return {
    name,
    ids,
    query,
    empty,
    options,
  };
}

function compareRequests(dataStore, prevComparator, nextComparator) {
  if (dataStore != null) return dataStore.compareRequests(prevComparator, nextComparator);
  return deepEquals(prevComparator, nextComparator);
}

function getEmptyValue({ name, ids, query, options, dataStore }, request, revision, empty) {
  return {
    name,
    ids,
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
  };
}

/**
 * Makes data from an DataStore available to its descendants using React's context API.
 * If not explicitly specified, necessary configuration is taken from the nearest <ConfigProvider>.
 */
class Resource extends Component {
  static getDerivedStateFromProps(nextProps, prevState) {
    const { empty, dataStore: ds, persistent } = nextProps;
    const _ = getComparator(nextProps);
    if (prevState.ds !== ds || !compareRequests(ds, prevState._, _)) {
      const request = uniqueIdentifier(prevState.request);
      const revision = uniqueIdentifier(prevState.revision);
      const isEmpty = ds == null || empty;
      const nextState = {
        _,
        ds,
        request,
        revision,
        isLoading: !isEmpty,
        persistent,
      };
      let isPersistent;
      if (
        prevState.value.meta.persistent === 'very' ||
        (persistent === 'very' && prevState.persistent === 'very')
      ) {
        isPersistent = 'very';
      } else if (prevState.value.meta.persistent || (persistent && prevState.persistent)) {
        isPersistent = true;
      }
      if (
        prevState.ds == null ||
        prevState.ds !== ds ||
        isEmpty ||
        !isPersistent ||
        (isPersistent !== 'very' && prevState._.name !== _.name)
      ) {
        nextState.value = getEmptyValue(nextProps, request, revision, isEmpty);
      }
      return nextState;
    }
    if (prevState.persistent !== persistent) {
      return { persistent };
    }
    return null;
  }

  constructor(props) {
    super(props);
    const { empty, dataStore: ds, persistent } = props;
    const request = uniqueIdentifier();
    const revision = uniqueIdentifier();
    const isEmpty = ds == null || empty;
    this.state = {
      _: getComparator(props),
      ds,
      request,
      revision,
      isLoading: !isEmpty,
      value: getEmptyValue(props, request, revision, isEmpty),
      persistent,
    };
  }

  componentDidMount() {
    const { name, empty, dataStore } = this.props;
    const { request, revision } = this.state;
    if (dataStore == null || empty) return;
    this.unsubscribe = dataStore.subscribe(name, this.notify);
    this.fetch(request, revision);
  }

  componentDidUpdate(prevProps, prevState) {
    const { name, empty, dataStore } = this.props;
    const { request, revision } = this.state;
    if (prevState.request !== request || prevState.revision !== revision) {
      if (this.abortSignal) this.abortSignal.abort();
      this.abortSignal = undefined;
    }
    if (dataStore == null || prevProps.dataStore !== dataStore || prevProps.name !== name) {
      if (this.unsubscribe) this.unsubscribe();
      this.unsubscribe = undefined;
      if (dataStore == null || empty) return;
      this.unsubscribe = dataStore.subscribe(name, this.notify);
    }
    if ((prevState.request !== request || prevState.revision !== revision) && !empty) {
      this.fetch(request, revision);
    }
  }

  componentWillUnmount() {
    this.isUnmounted = true;
    if (this.unsubscribe) this.unsubscribe();
    if (this.abortSignal) this.abortSignal.abort();
  }

  notify = async () =>
    new Promise((resolve) => {
      this.setState((currentState) => {
        if (currentState.ds == null || currentState.empty) return null;
        const nextRevision = uniqueIdentifier(currentState.revision);
        resolve({ request: currentState.request, revision: nextRevision });
        return {
          isLoading: true,
          revision: nextRevision,
        };
      });
    });

  fetch(request, revision) {
    const { ...props } = this.props;
    const { name, ids, query, options, dataStore } = props;
    const { value } = this.state;

    if (this.isUnmounted) {
      return;
    }

    const meta = new Meta({ ...value.meta });
    const signal = new AbortSignal();
    this.abortSignal = signal;

    const callback = (error, done, data) => {
      if (this.isUnmounted) return;
      this.setState((currentState) => {
        if (request !== currentState.request || revision !== currentState.revision) return null;

        if (error != null) {
          return {
            isLoading: false,
            value: {
              ...currentState.value,
              error,
              isIncomplete: false,
            },
          };
        }

        const { data: prevData, ...prevContext } = currentState.value;
        const { data: emptyData, ...emptyValue } = getEmptyValue(props, request, revision, false);
        const context = {
          ...emptyValue,
          meta: meta.commit(prevContext.meta),
          isIncomplete: !done,
          isInitial: currentState.isInitial && !done,
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

    dataStore.continuousGet(name, ids, query, options, meta, callback, signal);
  }

  render() {
    const { children, ...rest } = this.props;
    const { request, isLoading, value } = this.state;
    if (value.dataStore == null) return null;
    const contextValue = {
      ...value,
      isLoading,
      isStale: request !== value.request,
      notify: this.notify,
    };
    const plugins = Array.isArray(value.dataStore.resourcePlugins)
      ? value.dataStore.resourcePlugins
      : [];
    const renderProvider = (context) => (
      <ResourceContext.Provider value={context}>{children}</ResourceContext.Provider>
    );
    return plugins.reduceRight((next, Plugin) => {
      if (Plugin == null) return next;
      return (context) => (
        // eslint-disable-next-line react/jsx-props-no-spreading
        <Plugin {...rest} context={context}>
          {next}
        </Plugin>
      );
    }, renderProvider)(contextValue);
  }
}

Resource.propTypes = {
  /**
   * Resource name
   */
  name: PropTypes.string.isRequired,
  /**
   * IDs to be queried (in place of query)
   */
  ids: PropTypes.array,
  /**
   * Query filter (in place of ids)
   */
  query: PropTypes.any,
  /**
   * Whether to prevent fetching data
   */
  empty: PropTypes.bool,
  /**
   * DataStore options for requests
   */
  options: PropTypes.object,
  /**
   * DataStore to be used for requests
   */
  dataStore: dataStorePropType.isRequired,
  /**
   * Whether stale data should be retained during the next request - this only applies if neither dataStore nor name have changed, unless set to "very"
   */
  persistent: PropTypes.oneOfType([PropTypes.bool, PropTypes.oneOf(['very'])]),
  children: PropTypes.node,
};

/* eslint-disable react/jsx-props-no-spreading */
const withContext = (ChildComponent) => {
  const WithContext = (props) => (
    <ConfigContext.Consumer>
      {({ dataStore }) => <ChildComponent dataStore={dataStore} {...props} />}
    </ConfigContext.Consumer>
  );
  return WithContext;
};
/* eslint-enable react/jsx-props-no-spreading */

export default withContext(Resource);
