import React, { useContext } from 'react';

const noop = () => {};

export const ConfigContext = React.createContext({});
export const useConfigContext = () => useContext(ConfigContext);

export const ResourceContext = React.createContext({ data: [], notify: noop });
export const useResourceContext = () => useContext(ResourceContext);
