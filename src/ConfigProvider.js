import PropTypes from 'prop-types';
import React from 'react';

import { ConfigContext } from './context';
import { dataProviderPropType } from './DataProvider';

/**
 * Provides general configuration to its descendants using React's context API.
 */
function ConfigProvider({ provider, children }) {
  const context = React.useMemo(() => ({ provider }), [provider]);

  return <ConfigContext.Provider value={context}>{children}</ConfigContext.Provider>;
}

ConfigProvider.propTypes = {
  provider: dataProviderPropType,
  children: PropTypes.node,
};

export default ConfigProvider;
