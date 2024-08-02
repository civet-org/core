import deepEquals from 'fast-deep-equal';
import PropTypes from 'prop-types';

import AbortSignal from './AbortSignal';
import ChannelNotifier from './ChannelNotifier';
import Meta from './Meta';

const getMeta = (meta) => (meta instanceof Meta ? meta : new Meta(meta));

class DataStore {
  notifier = new ChannelNotifier();

  constructor() {
    this.resourcePlugins = [];
    this.extend({
      resource: (plugin) => {
        if (!this.resourcePlugins.includes(plugin)) {
          this.resourcePlugins.push(plugin);
        }
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

  get(resource, ids, query, options, meta) {
    return new Promise((resolve, reject) =>
      this.continuousGet(resource, ids, query, options, meta, (error, done, result) => {
        if (error != null) {
          reject(error);
          return;
        }
        if (done) resolve(result);
      }),
    );
  }

  continuousGet(resource, ids, query, options, meta, callback, abortSignal) {
    new Promise((resolve) => {
      if (resource == null) throw new Error('No resource name specified');
      if (ids != null && !Array.isArray(ids)) throw new Error('IDs must be an array');

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
        Promise.resolve(this.handleGet(resource, ids, query, options, getMeta(meta))).then(
          (result) => {
            if (typeof result === 'function') {
              result(cb, signal);
            } else {
              cb(undefined, true, result);
            }
          },
        ),
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

  update(resource, ids, query, data, options, meta) {
    return new Promise((resolve) => {
      if (resource == null) throw new Error('No resource name specified');
      if (ids != null && !Array.isArray(ids)) throw new Error('IDs must be an array');
      if (data == null) throw new Error('No data specified');
      resolve(
        Promise.resolve(this.handleUpdate(resource, ids, query, data, options, getMeta(meta))),
      );
    });
  }

  patch(resource, ids, query, data, options, meta) {
    return new Promise((resolve) => {
      if (resource == null) throw new Error('No resource name specified');
      if (ids != null && !Array.isArray(ids)) throw new Error('IDs must be an array');
      if (data == null) throw new Error('No data specified');
      resolve(
        Promise.resolve(this.handlePatch(resource, ids, query, data, options, getMeta(meta))),
      );
    });
  }

  remove(resource, ids, query, options, meta) {
    return new Promise((resolve) => {
      if (resource == null) throw new Error('No resource name specified');
      if (ids != null && !Array.isArray(ids)) throw new Error('IDs must be an array');
      resolve(Promise.resolve(this.handleRemove(resource, ids, query, options, getMeta(meta))));
    });
  }

  transition(nextData) {
    return nextData;
  }

  recycleItems(nextData) {
    return nextData;
  }

  compareRequests(prev, next) {
    return deepEquals(prev, next);
  }
}

const isDataStore = (dataStore) => dataStore instanceof DataStore;

const dataStorePropType = PropTypes.instanceOf(DataStore);

export default DataStore;
export { isDataStore, dataStorePropType };
