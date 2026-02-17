import DataProvider, {
  type ContinuousGet,
  type RequestDetails,
} from '@/DataProvider';
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
  Meta<GenericObject, DemoInstance>,
  DemoItem[]
> {
  static TEST = true;

  constructor(demoText: string) {
    super();
    console.log(demoText);
  }

  createInstance(): DemoInstance | undefined {
    return { instanceID: Date.now().toString() };
  }

  async handleGet(
    resourceName: string,
  ): Promise<DemoItem[] | ContinuousGet<DemoItem[]>> {
    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });

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

  getEmptyResponse(
    _requestDetails: RequestDetails<DemoQuery, DemoOptions>,
  ): DemoItem[] {
    return [];
  }
}
