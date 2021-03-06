import { noop } from './helpers';
import pipe from './pipe';
import _ from 'lodash';

export const copy =
  (source, destination) =>
    stream =>
      _.set(stream, destination, _.get(stream, source));

export const requireProp =
  prop =>
    (stream, close) =>
      noop(!_.has(stream, prop) && close(`Missing required prop ${prop}`));

export const log =
  (prop, message = 'Log:') =>
    stream =>
      console.log(message, _.get(stream, prop));

export const logStream =
  (message = 'Stream:') =>
    stream =>
      console.log(message, stream);

export const proxy =
  result =>
    stream =>
      result;

export const stringify =
  (source, destination) =>
    stream =>
      _.set(stream, destination || source, JSON.stringify(_.get(stream, source)));

export const stringifyStream =
  stream =>
    JSON.stringify(stream);

export const invoke =
  (method, objPath, prepareArgs) =>
    stream =>
      _.get(stream, objPath)[method](prepareArgs ? prepareArgs(stream) : stream);

export const newStream =
  stream =>
    ({});

export const append =
  (prop, value) =>
    stream =>
      _.set(stream, prop, value);

/**
 * @param pipe
 * @returns {Function}
 */
export const inverse =
  pipeline =>
    stream =>
      new Promise((resolve, reject) => pipe(stream, pipeline).then(reject).catch(resolve));
