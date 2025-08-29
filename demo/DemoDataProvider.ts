import DataProvider, { type ContinuousGet } from '@/DataProvider';

export type DemoQuery =
  | {
      query?: string;
    }
  | undefined;

export type DemoOptions = {
  demo?: boolean;
};

export type DemoItem = {
  id: string;
  [key: string]: unknown;
};

export type DemoInstance = {
  instanceID: string;
};

export type MyItem<ResourcePath> = ResourcePath extends 'assets/devices'
  ? { a: string }
  : object;

export default class DemoDataProvider extends DataProvider<
  DemoItem,
  DemoQuery,
  DemoOptions,
  DemoInstance
> {
  static TEST = true;

  constructor(demoText: string) {
    super();
    console.log(demoText);
  }

  createInstance(): DemoInstance | undefined {
    return { instanceID: Date.now().toString() };
  }

  handleGet(
    resourceName: string,
  ): DemoItem[] | Promise<DemoItem[]> | ContinuousGet<DemoItem> {
    switch (resourceName) {
      case 'haha':
        return [
          { id: 'a', name: 'A' },
          { id: 'b', name: 'B' },
        ];

      default:
        return [{ id: 'a' }, { id: 'b' }];
    }
  }

  handleCreate(): void | Promise<void> {
    throw new Error('Method not implemented.');
  }

  handleUpdate(): void | Promise<void> {
    throw new Error('Method not implemented.');
  }

  handlePatch(): void | Promise<void> {
    throw new Error('Method not implemented.');
  }

  handleRemove(): void | Promise<void> {
    throw new Error('Method not implemented.');
  }
}
