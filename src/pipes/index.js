import { noop } from '../helpers';
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
  (message, prop) =>
    stream =>
      console.log(message, _.get(stream, prop));

export const logStream =
    stream =>
      console.log(stream);
