export type RawMeta = { [key: string]: unknown };

export type MetaLike<Instance = unknown> = Meta<Instance> | RawMeta;

export default class Meta<Instance = unknown> {
  data: RawMeta;
  instance?: Instance;

  constructor(base?: RawMeta, instance?: Instance) {
    this.data = base == null ? {} : base;
    this.instance = instance;
  }

  clear = (): void => {
    Object.keys(this.data).forEach((key) => {
      delete this.data[key];
    });
  };

  delete = (key: string): unknown => {
    const value = this.data[key];
    delete this.data[key];
    return value;
  };

  entries = (): [string, unknown][] => Object.entries(this.data);

  get = (key: string): unknown => this.data[key];

  has = (key: string): boolean =>
    Object.prototype.hasOwnProperty.call(this.data, key);

  keys = (): string[] => Object.keys(this.data);

  set = (key: string, value: unknown): void => {
    this.data[key] = value;
  };

  values = (): unknown[] => Object.values(this.data);

  commit = (prev: RawMeta, ignore?: string[]): RawMeta => {
    const next = { ...this.data };
    ignore?.forEach((item) => {
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
