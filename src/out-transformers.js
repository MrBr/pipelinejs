import _ from 'lodash';

export const append =
  (src, dest) =>
    (result, stream) =>
      _.set(stream, dest || src, dest ? _.get(result, src) : result);
