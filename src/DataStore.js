import PropTypes from 'prop-types';
import deepEquals from 'fast-deep-equal';

import Meta from './Meta';
import Notifier from './Notifier';

const getMeta = meta => (meta instanceof Meta ? meta : new Meta(meta));

class DataStore {
  constructor() {
    this.subscriptions = {};
  }

  subscribe(resource, handler) {
    if (resource == null) throw new Error('No resource specified');
    if (this.subscriptions[resource] == null) this.subscriptions[resource] = new Notifier();
    return this.subscriptions[resource].subscribe(handler);
  }

  notify(resource) {
    if (resource == null) {
      Object.values(this.subscriptions).forEach(notifier => notifier.trigger());
    } else if (this.subscriptions[resource]) {
      this.subscriptions[resource].trigger();
    }
  }

  get(resource, ids, query, options, meta) {
    return new Promise(resolve => {
      if (resource == null) throw new Error('No resource specified');
      if (ids != null) {
        if (!Array.isArray(ids)) throw new Error('IDs must be an array');
        if (query != null) throw new Error("IDs and query aren't allowed at the same time");
      }
      resolve(
        Promise.resolve(this.handleGet(resource, ids, query, options, getMeta(meta))).then(
          result => {
            if (result == null) return [];
            if (Array.isArray(result)) return result;
            return [result];
          },
        ),
      );
    });
  }

  create(resource, data, options, meta) {
    return new Promise(resolve => {
      if (resource == null) throw new Error('No resource specified');
      if (data == null) throw new Error('No data specified');
      resolve(Promise.resolve(this.handleCreate(resource, data, options, getMeta(meta))));
    });
  }

  update(resource, ids, query, data, options, meta) {
    return new Promise(resolve => {
      if (resource == null) throw new Error('No resource specified');
      if (ids != null) {
        if (!Array.isArray(ids)) throw new Error('IDs must be an array');
        if (query != null) throw new Error("IDs and query aren't allowed at the same time");
      }
      if (data == null) throw new Error('No data specified');
      resolve(
        Promise.resolve(this.handleUpdate(resource, ids, query, data, options, getMeta(meta))),
      );
    });
  }

  patch(resource, ids, query, data, options, meta) {
    return new Promise(resolve => {
      if (resource == null) throw new Error('No resource specified');
      if (ids != null) {
        if (!Array.isArray(ids)) throw new Error('IDs must be an array');
        if (query != null) throw new Error("IDs and query aren't allowed at the same time");
      }
      if (data == null) throw new Error('No data specified');
      resolve(
        Promise.resolve(this.handlePatch(resource, ids, query, data, options, getMeta(meta))),
      );
    });
  }

  remove(resource, ids, query, options, meta) {
    return new Promise(resolve => {
      if (resource == null) throw new Error('No resource specified');
      if (ids != null) {
        if (!Array.isArray(ids)) throw new Error('IDs must be an array');
        if (query != null) throw new Error("IDs and query aren't allowed at the same time");
      }
      resolve(Promise.resolve(this.handleRemove(resource, ids, query, options, getMeta(meta))));
    });
  }

  recycleItems(nextData, prevData) {
    const prevItems = [...prevData];
    const result = nextData.map(nextItem => {
      const i = prevItems.findIndex(item => deepEquals(item, nextItem));
      if (i >= 0) {
        const [prevItem] = prevItems.splice(i, 1);
        return prevItem;
      }
      return nextItem;
    });
    if (
      prevData.length === result.length &&
      result.reduce((sum, item, i) => sum && prevData[i] === item, true)
    ) {
      return prevData;
    }
    return result;
  }
}

const isDataStore = dataStore => dataStore instanceof DataStore;

const dataStorePropType = PropTypes.instanceOf(DataStore);

export default DataStore;
export { isDataStore, dataStorePropType };
