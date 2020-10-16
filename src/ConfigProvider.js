import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

import { ConfigContext } from './context';
import { dataStorePropType } from './DataStore';

/**
 * Provides general configuration to its descendants using React's context API.
 */
function ConfigProvider({ dataStore, children }) {
  const context = useMemo(() => ({ dataStore }), [dataStore]);

  return <ConfigContext.Provider value={context}>{children}</ConfigContext.Provider>;
}

ConfigProvider.propTypes = {
  dataStore: dataStorePropType,
  children: PropTypes.node,
};

export default ConfigProvider;
