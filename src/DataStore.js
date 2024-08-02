import deepEquals from 'fast-deep-equal';
import objectHash from 'object-hash';
import PropTypes from 'prop-types';

import AbortSignal from './AbortSignal';
import ChannelNotifier from './ChannelNotifier';
import Meta from './Meta';

const getMeta = (meta) => (meta instanceof Meta ? meta : new Meta(meta));

class DataStore {
  notifier = new ChannelNotifier();

  constructor() {
    this.contextPlugins = new Set();
    this.uiPlugins = new Set();
    this.extend({
      context: (plugin) => {
        this.contextPlugins.add(plugin);
      },
      ui: (plugin) => {
        this.uiPlugins.add(plugin);
      },
    });
  }

  extend() {}

  subscribe(resource, handler) {
    if (resource == null) throw new Error('No resource name specified');
    return this.notifier.subscribe(resource, handler);
  }

  notify(resource) {
    this.notifier.trigger(resource);
  }

  get(resource, query, options, meta) {
    return new Promise((resolve, reject) =>
      this.continuousGet(resource, query, options, meta, (error, done, result) => {
        if (error != null) {
          reject(error);
          return;
        }
        if (done) resolve(result);
      }),
    );
  }

  continuousGet(resource, query, options, meta, callback, abortSignal) {
    new Promise((resolve) => {
      if (resource == null) throw new Error('No resource name specified');

      let complete = false;
      const signal = abortSignal == null ? new AbortSignal() : abortSignal;

      // result transformation
      const cb = (error, done, result) => {
        // prevent updates after completion
        if (complete) return;
        if (error != null || done) {
          complete = true;
          signal.lock();
        }
        if (error != null) callback(error, true, []);
        else if (result == null) callback(undefined, done, []);
        else if (Array.isArray(result)) callback(undefined, done, result);
        else callback(undefined, done, [result]);
      };

      resolve(
        Promise.resolve(this.handleGet(resource, query, options, getMeta(meta))).then((result) => {
          if (typeof result === 'function') {
            result(cb, signal);
          } else {
            cb(undefined, true, result);
          }
        }),
      );
    }).catch((e) => {
      callback(e, true, []);
    });
  }

  create(resource, data, options, meta) {
    return new Promise((resolve) => {
      if (resource == null) throw new Error('No resource name specified');
      if (data == null) throw new Error('No data specified');
      resolve(Promise.resolve(this.handleCreate(resource, data, options, getMeta(meta))));
    });
  }

  update(resource, query, data, options, meta) {
    return new Promise((resolve) => {
      if (resource == null) throw new Error('No resource name specified');
      if (data == null) throw new Error('No data specified');
      resolve(Promise.resolve(this.handleUpdate(resource, query, data, options, getMeta(meta))));
    });
  }

  patch(resource, query, data, options, meta) {
    return new Promise((resolve) => {
      if (resource == null) throw new Error('No resource name specified');
      if (data == null) throw new Error('No data specified');
      resolve(Promise.resolve(this.handlePatch(resource, query, data, options, getMeta(meta))));
    });
  }

  remove(resource, query, options, meta) {
    return new Promise((resolve) => {
      if (resource == null) throw new Error('No resource name specified');
      resolve(Promise.resolve(this.handleRemove(resource, query, options, getMeta(meta))));
    });
  }

  compareRequests(prev, next) {
    return deepEquals(prev, next);
  }

  compareItemVersions() {
    return true;
  }

  getItemIdentifier(item) {
    return objectHash(item);
  }

  transition(nextData) {
    return nextData;
  }

  recycleItems(nextData, prevData) {
    const prevMapping = {};
    if (nextData.length > 0) {
      prevData.forEach((item) => {
        const id = this.getItemIdentifier(item);
        if (id != null) prevMapping[id] = item;
      });
    }
    let result;
    if (prevData.length > 0) {
      result = nextData.map((nextItem) => {
        const id = this.getItemIdentifier(nextItem);
        if (id != null && Object.prototype.hasOwnProperty.call(prevMapping, id)) {
          const prevItem = prevMapping[id];
          if (this.compareItemVersions(nextItem, prevItem)) return prevItem;
        }
        return nextItem;
      });
    } else {
      result = nextData;
    }
    if (
      prevData.length === result.length &&
      result.reduce((sum, item, i) => sum && Object.is(prevData[i], item), true)
    ) {
      return prevData;
    }
    return result;
  }
}

const isDataStore = (dataStore) => dataStore instanceof DataStore;

const dataStorePropType = PropTypes.instanceOf(DataStore);

export default DataStore;
export { isDataStore, dataStorePropType };
