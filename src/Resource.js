import PropTypes from 'prop-types';
import React from 'react';

import { ResourceContext } from './context';
import { dataProviderPropType } from './DataProvider';
import useResource from './useResource';

const propTypes = {
  /** DataProvider to be used for requests */
  dataProvider: dataProviderPropType,
  /** Resource name */
  name: PropTypes.string.isRequired,
  /** Query */
  query: PropTypes.any,
  /** Whether to prevent fetching data */
  empty: PropTypes.bool,
  /** DataProvider options for requests */
  options: PropTypes.object,
  /** Whether stale data should be retained during the next request - this only applies if neither dataProvider nor name have changed, unless set to "very" */
  persistent: PropTypes.oneOfType([PropTypes.bool, PropTypes.oneOf(['very'])]),
  children: PropTypes.node,
};

/**
 * Makes data from an DataProvider available to its descendants using React's context API.
 * If not explicitly specified, necessary configuration is taken from the nearest <ConfigProvider>.
 * The provided DataProvider must not be replaced.
 */
function Resource({ dataProvider, name, query, empty, options, persistent, children, ...rest }) {
  const context = useResource({ dataProvider, name, query, empty, options, persistent, ...rest });

  return context.dataProvider.uiPlugins.reduceRight(
    (next, Plugin) => (result) =>
      (
        // eslint-disable-next-line react/jsx-props-no-spreading
        <Plugin {...rest} context={result}>
          {next}
        </Plugin>
      ),
    (result) => <ResourceContext.Provider value={result}>{children}</ResourceContext.Provider>,
  )(context);
}

Resource.propTypes = propTypes;

export default Resource;
