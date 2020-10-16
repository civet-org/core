import deepEquals from 'fast-deep-equal';

class Meta {
  constructor(base) {
    this.data = base == null ? {} : base;
  }

  clear() {
    Object.keys(this.data).forEach((key) => {
      delete this.data[key];
    });
  }

  delete(key) {
    const value = this.data[key];
    delete this.data[key];
    return value;
  }

  entries() {
    return Object.entries(this.data);
  }

  get(key) {
    return this.data[key];
  }

  has(key) {
    return Object.prototype.hasOwnProperty.call(this.data, key);
  }

  keys() {
    return Object.keys(this.data);
  }

  set(key, value) {
    this.data[key] = value;
  }

  values() {
    return Object.values(this.data);
  }

  commit(prev) {
    const freezed = JSON.parse(JSON.stringify(this.data));
    if (prev != null && deepEquals(prev, freezed)) return prev;
    return freezed;
  }
}

export default Meta;
