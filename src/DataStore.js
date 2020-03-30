import PropTypes from 'prop-types';

import AbortSignal from './AbortSignal';
import Meta from './Meta';
import Notifier from './Notifier';

const getMeta = (meta) => (meta instanceof Meta ? meta : new Meta(meta));

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
      Object.values(this.subscriptions).forEach((notifier) => notifier.trigger());
    } else if (this.subscriptions[resource]) {
      this.subscriptions[resource].trigger();
    }
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
      if (resource == null) throw new Error('No resource specified');
      if (ids != null) {
        if (!Array.isArray(ids)) throw new Error('IDs must be an array');
        if (query != null) throw new Error("IDs and query aren't allowed at the same time");
      }

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
      if (resource == null) throw new Error('No resource specified');
      if (data == null) throw new Error('No data specified');
      resolve(Promise.resolve(this.handleCreate(resource, data, options, getMeta(meta))));
    });
  }

  update(resource, ids, query, data, options, meta) {
    return new Promise((resolve) => {
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
    return new Promise((resolve) => {
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
    return new Promise((resolve) => {
      if (resource == null) throw new Error('No resource specified');
      if (ids != null) {
        if (!Array.isArray(ids)) throw new Error('IDs must be an array');
        if (query != null) throw new Error("IDs and query aren't allowed at the same time");
      }
      resolve(Promise.resolve(this.handleRemove(resource, ids, query, options, getMeta(meta))));
    });
  }

  transition(nextData) {
    return nextData;
  }

  recycleItems(nextData) {
    return nextData;
  }
}

const isDataStore = (dataStore) => dataStore instanceof DataStore;

const dataStorePropType = PropTypes.instanceOf(DataStore);

export default DataStore;
export { isDataStore, dataStorePropType };
