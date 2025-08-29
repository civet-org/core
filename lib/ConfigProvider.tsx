import { useMemo, type PropsWithChildren, type ReactNode } from 'react';
import { type GenericDataProvider } from './DataProvider';
import { ConfigContext } from './context';

/**
 * Provides general configuration to its descendants using React's context API.
 */
export default function ConfigProvider<
  DataProviderI extends GenericDataProvider,
>({
  dataProvider,
  children,
}: PropsWithChildren<{ dataProvider: DataProviderI }>): ReactNode {
  const context = useMemo(() => ({ dataProvider }), [dataProvider]);

  return (
    <ConfigContext.Provider value={context}>{children}</ConfigContext.Provider>
  );
}
