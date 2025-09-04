import DataProvider, { type ContinuousGet } from '@/DataProvider';
import type Meta from '@/Meta';
import type { GenericObject } from '@/utilityTypes';

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
} & GenericObject;

export type DemoInstance = {
  instanceID: string;
};

export default class DemoDataProvider extends DataProvider<
  DemoItem,
  DemoQuery,
  DemoOptions,
  Meta,
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
  ):
    | Promise<DemoItem[] | ContinuousGet<DemoItem>>
    | DemoItem[]
    | ContinuousGet<DemoItem> {
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
