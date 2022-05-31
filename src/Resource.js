import PropTypes from 'prop-types';
import React from 'react';

import { ResourceContext } from './context';
import { dataProviderPropType } from './DataProvider';
import useResource from './useResource';

/**
 * Makes data from an DataProvider available to its descendants using React's context API.
 * If not explicitly specified, necessary configuration is taken from the nearest <ConfigProvider>.
 * The provided DataProvider must not be replaced.
 */
function Resource({ children, ...props }) {
  const context = useResource(props);

  return <ResourceContext.Provider value={context}>{children}</ResourceContext.Provider>;
}

Resource.propTypes = {
  /**
   * Resource name
   */
  name: PropTypes.string.isRequired,
  /**
   * Query
   */
  query: PropTypes.any,
  /**
   * Whether to prevent fetching data
   */
  empty: PropTypes.bool,
  /**
   * DataProvider options for requests
   */
  options: PropTypes.object,
  /**
   * DataProvider to be used for requests
   */
  dataProvider: dataProviderPropType.isRequired,
  /**
   * Whether stale data should be retained during the next request - this only applies if neither dataProvider nor name have changed, unless set to "very"
   */
  persistent: PropTypes.oneOfType([PropTypes.bool, PropTypes.oneOf(['very'])]),
  children: PropTypes.node,
};

export default Resource;
