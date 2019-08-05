import React, { Component } from 'react';
import PropTypes from 'prop-types';
import deepEquals from 'fast-deep-equal';
import uuid from 'uuid/v1';

import { ConfigContext, ResourceContext } from './context';
import { dataStorePropType } from './DataStore';
import Meta from './Meta';
import AbortSignal from './AbortSignal';

const getComparator = ({ name, ids, query, empty, options }) => ({
  name,
  ids,
  query,
  empty,
  options,
});

const getEmptyValue = ({ name, ids, query, options, dataStore }, request, revision, empty) => ({
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
});

/**
 * Makes data from an DataStore available to its descendants using React's context API.
 * If not explicitly specified, necessary configuration is taken from the nearest <ConfigProvider>.
 */
class Resource extends Component {
  static getDerivedStateFromProps(nextProps, prevState) {
    const { empty, dataStore: ds, persistent } = nextProps;
    const _ = getComparator(nextProps);
    if (prevState.ds !== ds || !deepEquals(prevState._, _)) {
      const request = uuid();
      const revision = uuid();
      const isEmpty = ds == null || empty;
      const nextState = {
        _,
        ds,
        request,
        revision,
        activeFetches: isEmpty ? 0 : 1,
      };
      if (
        prevState.ds == null ||
        isEmpty ||
        !persistent ||
        (persistent !== 'very' && (prevState.ds !== ds || prevState._.name !== _.name))
      ) {
        nextState.value = getEmptyValue(nextProps, request, revision, isEmpty);
      }
      return nextState;
    }
    return null;
  }

  constructor(props) {
    super(props);
    const { empty, dataStore: ds } = props;
    const request = uuid();
    const revision = uuid();
    const isEmpty = ds == null || empty;
    this.state = {
      _: getComparator(props),
      ds,
      request,
      revision,
      activeFetches: isEmpty ? 0 : 1,
      value: getEmptyValue(props, request, revision, isEmpty),
    };
  }

  componentDidMount() {
    const { name, empty, dataStore } = this.props;
    const { request, revision } = this.state;
    if (dataStore == null || empty) return;
    this.unsubscribe = dataStore.subscribe(name, () => this.handleNotify());
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
      this.unsubscribe = dataStore.subscribe(name, () => this.handleNotify());
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

  handleNotify = () => {
    const { empty, dataStore } = this.props;
    const { request } = this.state;
    if (dataStore == null || empty) return;
    this.setState(currentState => {
      if (request !== currentState.request) return null;
      return {
        activeFetches: Math.min(currentState.activeFetches + 1, Number.MAX_SAFE_INTEGER),
        revision: uuid(),
      };
    });
  };

  fetch(request, revision) {
    const { ...props } = this.props;
    const { name, ids, query, options, dataStore } = props;
    if (this.isUnmounted) {
      return;
    }

    const meta = new Meta();
    const signal = new AbortSignal();
    this.abortSignal = signal;

    const callback = (error, done, data) => {
      if (this.isUnmounted) return;
      this.setState(currentState => {
        if (request !== currentState.request || revision !== currentState.revision) return null;
        let { activeFetches } = currentState;
        if (error != null || done) activeFetches = Math.max(currentState.activeFetches - 1, 0);
        if (error != null) {
          return {
            activeFetches,
            value: {
              ...currentState.value,
              error,
              isIncomplete: false,
            },
          };
        }
        return {
          activeFetches,
          value: {
            ...getEmptyValue(props, request, revision, false),
            data: dataStore.recycleItems(data, currentState.value.data),
            meta: meta.commit(currentState.value.meta),
            isIncomplete: !done,
          },
        };
      });
    };

    dataStore.continuousGet(name, ids, query, options, meta, callback, signal);
  }

  render() {
    const { children } = this.props;
    const { request, activeFetches, value } = this.state;
    if (value.dataStore == null) return null;
    const context = {
      ...value,
      isLoading: activeFetches > 0,
      isStale: request !== value.request,
      notify: this.handleNotify,
    };
    return <ResourceContext.Provider value={context}>{children}</ResourceContext.Provider>;
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

const withContext = ChildComponent => {
  const WithContext = props => (
    <ConfigContext.Consumer>
      {({ dataStore }) => <ChildComponent dataStore={dataStore} {...props} />}
    </ConfigContext.Consumer>
  );
  return WithContext;
};

export default withContext(Resource);
