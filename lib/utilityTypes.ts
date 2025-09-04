// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<Args extends any[], T> = new (...args: Args) => T;

export type GenericObject = { [key: string]: unknown };
