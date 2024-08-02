import PropTypes from 'prop-types';
import React from 'react';

import { ResourceContext } from './context';
import { dataStorePropType } from './DataStore';
import useResource from './useResource';

/**
 * Makes data from an DataStore available to its descendants using React's context API.
 * If not explicitly specified, necessary configuration is taken from the nearest <ConfigProvider>.
 * The provided DataStore must not be replaced.
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
   * DataStore options for requests
   */
  options: PropTypes.object,
  /**
   * DataStore to be used for requests
   */
  dataStore: dataStorePropType.isRequired,
  /**
   * Whether stale data should be retained during the next request - this only applies if neither dataStore nor name have changed, unless set to "very"
   */
  persistent: PropTypes.oneOfType([PropTypes.bool, PropTypes.oneOf(['very'])]),
  children: PropTypes.node,
};

export default Resource;
