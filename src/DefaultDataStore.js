import objectHash from 'object-hash';

import BaseDataStore from './DataStore';

class DefaultDataStore extends BaseDataStore {
  recycleItemsUniqueIdentifier(item) {
    return objectHash(item);
  }

  recycleItemsIsUnchanged() {
    return true;
  }

  recycleItems(nextData, prevData) {
    const prevMapping = {};
    prevData.forEach((item) => {
      const id = this.recycleItemsUniqueIdentifier(item);
      if (id != null) prevMapping[id] = item;
    });
    const result = nextData.map((nextItem) => {
      const id = this.recycleItemsUniqueIdentifier(nextItem);
      if (id != null && Object.prototype.hasOwnProperty.call(prevMapping, id)) {
        const prevItem = prevMapping[id];
        if (this.recycleItemsIsUnchanged(nextItem, prevItem)) return prevItem;
      }
      return nextItem;
    });
    if (
      prevData.length === result.length &&
      result.reduce((sum, item, i) => sum && Object.is(prevData[i], item), true)
    ) {
      return prevData;
    }
    return result;
  }
}

export default DefaultDataStore;
