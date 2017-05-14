import { noop } from '../helpers';
import _ from 'lodash';

export const disconnect =
  pipeline =>
    stream =>
      noop(pipeline(stream, () => {}));

export const copy =
  (source, destination) =>
    stream =>
      _.set(stream, destination, _.get(stream, source));
