class Meta {
  constructor(base, instance) {
    this.data = base == null ? {} : base;
    this.instance = instance;
  }

  clear = () => {
    Object.keys(this.data).forEach((key) => {
      delete this.data[key];
    });
  };

  delete = (key) => {
    const value = this.data[key];
    delete this.data[key];
    return value;
  };

  entries = () => Object.entries(this.data);

  get = (key) => this.data[key];

  has = (key) => Object.prototype.hasOwnProperty.call(this.data, key);

  keys = () => Object.keys(this.data);

  set = (key, value) => {
    this.data[key] = value;
  };

  values = () => Object.values(this.data);

  commit = (prev, ignore) => {
    const next = { ...this.data };
    (ignore || []).forEach((item) => {
      delete next[item];
    });
    const keys = Object.keys(next);
    if (
      prev != null &&
      Object.keys(prev).length === keys.length &&
      keys.reduce((sum, key) => sum && Object.is(next[key], prev[key]), true)
    ) {
      return prev;
    }
    return next;
  };
}

export default Meta;
