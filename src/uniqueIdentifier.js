import { v1 as uuid } from 'uuid';

/**
 * Returns incrementing unique string identifiers.
 * Uniqueness is guaranteed for <Number.MAX_SAFE_INTEGER> iterations.
 * The values can be compared alphanumerically, as long as they do not exceed the previously specified number of iterations.
 *
 * @param {string?} previous Previous identifier
 */
function uniqueIdentifier(previous) {
  let prefix;
  let value;
  let scope;
  if (typeof previous !== 'string') {
    prefix = '~';
    value = 0;
    scope = uuid();
  } else {
    let prevValue;
    [prefix, prevValue, scope] = previous.split('$');
    value = ((parseInt(prevValue, 36) || 0) + 1) % Number.MAX_SAFE_INTEGER;
    if (value === 0) prefix += '~';
  }
  return `${prefix}$${value.toString(36).padStart(11, '0')}$${scope}`;
}

export default uniqueIdentifier;
