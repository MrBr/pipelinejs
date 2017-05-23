import { noop } from '../helpers';
import _ from 'lodash';

export const pick =
  (src, dest) =>
    (result, stream) =>
      noop(_.set(stream, dest, _.get(result, src)), stream);

export const append =
  prop =>
    (result, stream) =>
      noop(_.set(stream, prop, result), stream);
