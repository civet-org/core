import PropTypes from 'prop-types';
import { dataProviderPropType } from './DataProvider';
import { ResourceContext } from './context';
import useResource from './useResource';

const propTypes = {
  /** DataProvider to be used for requests - must not be changed */
  dataProvider: dataProviderPropType,
  /** Resource name */
  name: PropTypes.string.isRequired,
  /** Query instructions */
  query: PropTypes.any,
  /** Disables fetching data, resulting in an empty data array */
  empty: PropTypes.bool,
  /** Query options for requests */
  options: PropTypes.object,
  /** Whether stale data should be retained during the next request - this only applies if name did not change, unless set to "very" */
  persistent: PropTypes.oneOfType([PropTypes.bool, PropTypes.oneOf(['very'])]),
  children: PropTypes.node,
};

/**
 * Provides data based on the given request details and DataProvider.
 * Context provider for the ResourceContext.
 *
 * Necessary configuration that is not directly specified is taken from the ConfigContext.
 *
 * The provided DataProvider must not be changed.
 */
function Resource({ dataProvider, name, query, empty, options, persistent, children, ...rest }) {
  const context = useResource({ dataProvider, name, query, empty, options, persistent, ...rest });

  return context.dataProvider.uiPlugins.reduceRight(
    (next, Plugin) =>
      // eslint-disable-next-line react/display-name
      (result) => (
        <Plugin {...rest} context={result}>
          {next}
        </Plugin>
      ),
    (result) => <ResourceContext.Provider value={result}>{children}</ResourceContext.Provider>,
  )(context);
}

Resource.propTypes = propTypes;

export default Resource;
