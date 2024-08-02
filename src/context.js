import { createContext, useContext } from 'react';

const noop = () => {};

export const ConfigContext = createContext({});
ConfigContext.displayName = 'ConfigContext';
export const useConfigContext = () => useContext(ConfigContext);

export const ResourceContext = createContext({ data: [], notify: noop });
ResourceContext.displayName = 'ResourceContext';
export const useResourceContext = () => useContext(ResourceContext);
