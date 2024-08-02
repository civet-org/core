import PropTypes from 'prop-types';
import deepEquals from 'fast-deep-equal';

import Notifier from './Notifier';

class DataStore {
  constructor() {
    this.subscriptions = {};
  }

  subscribe(resource, handler) {
    if (!resource) throw new Error('No resource specified');
    if (!this.subscriptions[resource]) this.subscriptions[resource] = new Notifier();
    return this.subscriptions[resource].subscribe(handler);
  }

  notify(resource) {
    if (resource == null) {
      Object.values(this.subscriptions).forEach(notifier => notifier.trigger());
    } else if (this.subscriptions[resource]) {
      this.subscriptions[resource].trigger();
    }
  }

  get(resource, ids, query, options) {
    return new Promise(resolve => {
      if (!resource) throw new Error('No resource specified');
      if (ids != null) {
        if (!Array.isArray(ids)) throw new Error('IDs must be an array');
        if (query != null) throw new Error("IDs and query aren't allowed at the same time");
      }
      resolve(
        Promise.resolve(this.handleGet(resource, ids, query, options)).then(result => {
          if (result == null) return [];
          if (Array.isArray(result)) return result;
          return [result];
        }),
      );
    });
  }

  create(resource, data, options) {
    return new Promise(resolve => {
      if (!resource) throw new Error('No resource specified');
      if (!data) throw new Error('No data specified');
      resolve(Promise.resolve(this.handleCreate(resource, data, options)));
    });
  }

  update(resource, ids, query, data, options) {
    return new Promise(resolve => {
      if (!resource) throw new Error('No resource specified');
      if (ids != null) {
        if (!Array.isArray(ids)) throw new Error('IDs must be an array');
        if (query != null) throw new Error("IDs and query aren't allowed at the same time");
      }
      if (!data) throw new Error('No data specified');
      resolve(Promise.resolve(this.handleUpdate(resource, ids, query, data, options)));
    });
  }

  patch(resource, ids, query, data, options) {
    return new Promise(resolve => {
      if (!resource) throw new Error('No resource specified');
      if (ids != null) {
        if (!Array.isArray(ids)) throw new Error('IDs must be an array');
        if (query != null) throw new Error("IDs and query aren't allowed at the same time");
      }
      if (!data) throw new Error('No data specified');
      resolve(Promise.resolve(this.handlePatch(resource, ids, query, data, options)));
    });
  }

  remove(resource, ids, query, options) {
    return new Promise(resolve => {
      if (!resource) throw new Error('No resource specified');
      if (ids != null) {
        if (!Array.isArray(ids)) throw new Error('IDs must be an array');
        if (query != null) throw new Error("IDs and query aren't allowed at the same time");
      }
      resolve(Promise.resolve(this.handleRemove(resource, ids, query, options)));
    });
  }

  recycleItems(nextData, prevData) {
    if (deepEquals(prevData, nextData)) {
      return prevData;
    }
    const items = [...prevData];
    const result = [];
    nextData.forEach(nextItem => {
      const i = items.findIndex(item => deepEquals(item, nextItem));
      if (i === -1) {
        result.push(nextItem);
      } else {
        result.push(items[i]);
        items.splice(i, 1);
      }
    });
    return result;
  }
}

const isDataStore = dataStore => dataStore instanceof DataStore;

const dataStorePropType = PropTypes.instanceOf(DataStore);

export default DataStore;
export { isDataStore, dataStorePropType };
