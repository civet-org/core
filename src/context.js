import React from 'react';

const noop = () => {};

export const ConfigContext = React.createContext({});
ConfigContext.displayName = 'ConfigContext';
export const useConfigContext = () => React.useContext(ConfigContext);

export const ResourceContext = React.createContext({ data: [], notify: noop });
ResourceContext.displayName = 'ResourceContext';
export const useResourceContext = () => React.useContext(ResourceContext);
