import PropTypes from 'prop-types';
import React from 'react';

import { ConfigContext } from './context';
import { dataProviderPropType } from './DataProvider';

/**
 * Provides general configuration to its descendants using React's context API.
 */
function ConfigProvider({ dataProvider, children }) {
  const context = React.useMemo(() => ({ dataProvider }), [dataProvider]);

  return <ConfigContext.Provider value={context}>{children}</ConfigContext.Provider>;
}

ConfigProvider.propTypes = {
  dataProvider: dataProviderPropType,
  children: PropTypes.node,
};

export default ConfigProvider;
