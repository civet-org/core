import deepEquals from 'fast-deep-equal';

import BaseDataStore from './DataStore';

class DefaultDataStore extends BaseDataStore {
  recycleItemsCompareIdentity(nextItem, prevItem) {
    return deepEquals(nextItem, prevItem);
  }

  recycleItemsIsUnchanged() {
    return true;
  }

  recycleItems(nextData, prevData) {
    const prevItems = [...prevData];
    const result = nextData.map(nextItem => {
      const i = prevItems.findIndex(item => this.recycleItemsCompareIdentity(nextItem, item));
      if (i >= 0) {
        const [prevItem] = prevItems.splice(i, 1);
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
