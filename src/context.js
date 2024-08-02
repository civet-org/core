import React from 'react';

const noop = () => {};

export const ConfigContext = React.createContext({});
export const ResourceContext = React.createContext({ data: [], notify: noop });
