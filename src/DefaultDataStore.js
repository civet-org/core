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
      prevMapping[this.recycleItemsUniqueIdentifier(item)] = item;
    });
    const result = nextData.map((nextItem) => {
      const identifier = this.recycleItemsUniqueIdentifier(nextItem);
      if (Object.prototype.hasOwnProperty.call(prevMapping, identifier)) {
        const prevItem = prevMapping[identifier];
        if (this.recycleItemsIsUnchanged(nextItem, prevItem)) return prevItem;
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

export default DefaultDataStore;
