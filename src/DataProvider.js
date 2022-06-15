import deepEquals from 'fast-deep-equal';
import objectHash from 'object-hash';
import PropTypes from 'prop-types';

import AbortSignal from './AbortSignal';
import ChannelNotifier from './ChannelNotifier';
import Meta from './Meta';

const getMeta = (meta) => (meta instanceof Meta ? meta : new Meta(meta));

class DataProvider {
  notifier = new ChannelNotifier();

  constructor() {
    const contextPlugins = [];
    const uiPlugins = [];
    this.extend({
      context: (plugin) => {
        const plugins = contextPlugins;
        if (plugin != null && !plugins.includes(plugin)) plugins.push(plugin);
      },
      ui: (plugin) => {
        const plugins = uiPlugins;
        if (plugin != null && !plugins.includes(plugin)) plugins.push(plugin);
      },
    });
    Object.defineProperties(this, {
      contextPlugins: {
        value: Object.freeze(contextPlugins.slice()),
        enumerable: true,
        writable: false,
        configurable: false,
      },
      uiPlugins: {
        value: Object.freeze(uiPlugins.slice()),
        enumerable: true,
        writable: false,
        configurable: false,
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
    const signal = abortSignal == null ? new AbortSignal() : abortSignal;

    new Promise((resolve) => {
      if (resource == null) throw new Error('No resource name specified');

      // result transformation
      const cb = (error, done, result) => {
        // prevent updates after completion
        if (signal.locked) return;
        if (error != null || done) {
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
            result(cb, signal.proxy());
          } else {
            cb(undefined, true, result);
          }
        }),
      );
    }).catch((e) => {
      if (!signal.locked) callback(e, true, []);
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

  compareRequests(nextRequestDetails, prevRequestDetails) {
    return deepEquals(nextRequestDetails, prevRequestDetails);
  }

  shouldPersist(nextRequestDetails, prevRequestDetails, persistent) {
    return (
      persistent === 'very' || (persistent && prevRequestDetails.name === nextRequestDetails.name)
    );
  }

  compareItemVersions() {
    return true;
  }

  getItemIdentifier(item) {
    return objectHash(item);
  }

  transition(nextContext) {
    return nextContext.data;
  }

  recycleItems(nextContext, prevContext) {
    const prevMapping = {};
    if (nextContext.data.length > 0) {
      prevContext.data.forEach((item) => {
        const id = this.getItemIdentifier(item);
        if (id != null) prevMapping[id] = item;
      });
    }
    let result;
    if (prevContext.data.length > 0) {
      result = nextContext.data.map((nextItem) => {
        const id = this.getItemIdentifier(nextItem);
        if (id != null && Object.prototype.hasOwnProperty.call(prevMapping, id)) {
          const prevItem = prevMapping[id];
          if (this.compareItemVersions(nextItem, prevItem)) return prevItem;
        }
        return nextItem;
      });
    } else {
      result = nextContext.data;
    }
    if (
      prevContext.data.length === result.length &&
      result.reduce((sum, item, i) => sum && Object.is(prevContext.data[i], item), true)
    ) {
      return prevContext.data;
    }
    return result;
  }
}

const isDataProvider = (dataProvider) => dataProvider instanceof DataProvider;

const dataProviderPropType = PropTypes.instanceOf(DataProvider);

export default DataProvider;
export { isDataProvider, dataProviderPropType };
