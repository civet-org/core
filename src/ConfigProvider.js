import React from 'react';
import PropTypes from 'prop-types';

import { ConfigContext } from './context';
import { dataStorePropType } from './DataStore';

const ConfigProvider = ({ dataStore, children }) => (
  <ConfigContext.Provider value={{ dataStore }}>
    {children}
  </ConfigContext.Provider>
);

ConfigProvider.propTypes = {
  dataStore: dataStorePropType,
  children: PropTypes.node,
};

export default ConfigProvider;
