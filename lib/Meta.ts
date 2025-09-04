import type { GenericObject } from './utilityTypes';

export type MetaLike<MetaI extends Meta> = MetaI | InferSchema<MetaI>;

export default class Meta<
  Schema extends GenericObject = GenericObject,
  Instance = unknown,
> {
  readonly _inferSchema!: Schema;
  readonly _inferInstance!: Instance;

  data: Schema;
  instance?: Instance;

  constructor(base?: Schema, instance?: Instance) {
    this.data = (base == null ? {} : base) as Schema;
    this.instance = instance;
  }

  clear = (): void => {
    Object.keys(this.data).forEach((key) => {
      delete this.data[key];
    });
  };

  delete = <Key extends keyof Schema>(key: Key): Schema[Key] => {
    const value = this.data[key];
    delete this.data[key];
    return value;
  };

  entries = (): [keyof Schema, Schema[keyof Schema]][] =>
    Object.entries(this.data) as [keyof Schema, Schema[keyof Schema]][];

  get = <Key extends keyof Schema>(key: Key): Schema[Key] => this.data[key];

  has = (key: keyof Schema): boolean =>
    Object.prototype.hasOwnProperty.call(this.data, key);

  keys = (): (keyof Schema)[] => Object.keys(this.data);

  set = <Key extends keyof Schema>(key: Key, value: Schema[Key]): void => {
    this.data[key] = value;
  };

  values = (): Schema[keyof Schema][] =>
    Object.values(this.data) as Schema[keyof Schema][];

  commit = (prev: Schema, ignore?: (keyof Schema)[]): Schema => {
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

export type InferSchema<MetaI extends Meta> = MetaI['_inferSchema'];

export type InferInstance<MetaI extends Meta> = MetaI['_inferInstance'];
