import { Resource, ResourceConsumer, ResourceProvider } from '@/main';
import useResource from '@/useResource';
import DemoDataProvider, { type DemoItem } from './DemoDataProvider';

type HahaItem = DemoItem & {
  name: string;
};

export default function DemoResource() {
  const resource = useResource<DemoDataProvider, HahaItem>({
    name: 'haha',
    query: undefined,
  });

  return (
    <>
      {resource.data.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}

      <ResourceProvider resource={resource}>
        <ResourceConsumer<DemoDataProvider, HahaItem>>
          {(resource) =>
            resource.data.map((item) => <div key={item.id}>{item.name}</div>)
          }
        </ResourceConsumer>
      </ResourceProvider>

      <Resource<DemoDataProvider> name="haha" query={undefined}>
        <ResourceConsumer<DemoDataProvider, HahaItem>>
          {(resource) =>
            resource.data.map((item) => <div key={item.id}>{item.name}</div>)
          }
        </ResourceConsumer>
      </Resource>
    </>
  );
}
