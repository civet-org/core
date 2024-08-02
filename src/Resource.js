import React, { Component } from 'react';
import PropTypes from 'prop-types';
import deepEquals from 'fast-deep-equal';

import { ConfigContext, ResourceContext } from './context';
import { dataStorePropType } from './DataStore';

const getComparator = ({ name, ids, query, empty, options }) => ({
  name,
  ids,
  query,
  empty,
  options,
});

const getEmptyValue = (
  { name, ids, query, empty, options, dataStore },
  request,
) => ({
  name,
  ids,
  query,
  options,
  dataStore,
  request,
  data: [],
  error: undefined,
  isEmpty: Boolean(empty),
});

class Resource extends Component {
  static getDerivedStateFromProps(nextProps, prevState) {
    const { empty, dataStore: ds, persistent } = nextProps;
    const _ = getComparator(nextProps);
    if (prevState.ds !== ds || !deepEquals(prevState._, _)) {
      const request = (prevState.request + 1) % Number.MAX_SAFE_INTEGER;
      const nextState = {
        _,
        ds,
        request,
        activeFetches: ds == null || empty ? 0 : 1,
      };
      if (
        prevState.ds == null ||
        ds == null ||
        empty ||
        !persistent ||
        (persistent !== 'very' &&
          (prevState.ds !== ds || prevState._.name !== _.name))
      ) {
        nextState.value = getEmptyValue(nextProps, request);
      }
      return nextState;
    }
    return null;
  }

  constructor(props) {
    super(props);
    const { empty, dataStore: ds } = props;
    this.state = {
      _: getComparator(props),
      ds,
      request: 0,
      activeFetches: ds == null || empty ? 0 : 1,
      value: getEmptyValue(props, 0),
    };
  }

  componentDidMount() {
    const { name, empty, dataStore } = this.props;
    const { request } = this.state;
    if (dataStore == null || empty) return;
    this.unsubscribe = dataStore.subscribe(name, () => this.handleNotify());
    this.fetch(request);
  }

  componentDidUpdate(prevProps, prevState) {
    const { name, empty, dataStore } = this.props;
    const { request } = this.state;
    if (
      dataStore == null ||
      prevProps.dataStore !== dataStore ||
      prevProps.name !== name
    ) {
      if (this.unsubscribe) this.unsubscribe();
      this.unsubscribe = undefined;
      if (dataStore == null || empty) return;
      this.unsubscribe = this.props.dataStore.subscribe(name, () =>
        this.handleNotify(),
      );
    }
    if (prevState.request !== request && !empty) {
      this.fetch(request);
    }
  }

  componentWillUnmount() {
    this.isUnmounted = true;
    if (this.unsubscribe) this.unsubscribe();
  }

  handleNotify() {
    const { empty, dataStore } = this.props;
    const { request } = this.state;
    if (dataStore == null || empty) return;
    this.setState(
      currentState => {
        if (request !== currentState.request) return null;
        return {
          activeFetches: Math.min(
            currentState.activeFetches + 1,
            Number.MAX_SAFE_INTEGER,
          ),
        };
      },
      () => this.fetch(request),
    );
  }

  fetch(request) {
    const { ...props } = this.props;
    const { name, ids, query, options, dataStore } = props;
    if (request !== this.state.request || this.isUnmounted) return;
    dataStore
      .get(name, ids, query, options)
      .then(data => ({ data }))
      .catch(error => {
        if (error == null) return { error: true };
        return { error };
      })
      .then(nextState => {
        if (this.isUnmounted) return;
        this.setState(currentState => {
          if (request !== currentState.request) return null;
          const activeFetches = Math.max(currentState.activeFetches - 1, 0);
          if (nextState.error != null) {
            return {
              activeFetches,
              value: {
                ...currentState.value,
                error: nextState.error,
              },
            };
          }
          return {
            activeFetches,
            value: {
              ...getEmptyValue(props, request),
              data: nextState.data,
            },
          };
        });
      });
  }

  render() {
    const { children } = this.props;
    const { request, activeFetches, value } = this.state;
    if (value.dataStore == null) return null;
    const context = {
      ...value,
      isLoading: activeFetches > 0,
      isStale: request !== value.request,
      notify: () => this.handleNotify(),
    };
    return (
      <ResourceContext.Provider value={context}>
        {children}
      </ResourceContext.Provider>
    );
  }
}

Resource.propTypes = {
  name: PropTypes.string.isRequired,
  ids: PropTypes.array,
  query: PropTypes.any,
  empty: PropTypes.bool,
  options: PropTypes.object,
  dataStore: dataStorePropType.isRequired,
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
