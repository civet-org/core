import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { dataProviderPropType } from './DataProvider';
import { ConfigContext } from './context';

/**
 * Provides general configuration to its descendants using React's context API.
 */
function ConfigProvider({ dataProvider, children }) {
  const context = useMemo(() => ({ dataProvider }), [dataProvider]);

  return (
    <ConfigContext.Provider value={context}>{children}</ConfigContext.Provider>
  );
}

ConfigProvider.propTypes = {
  dataProvider: dataProviderPropType,
  children: PropTypes.node,
};

export default ConfigProvider;
