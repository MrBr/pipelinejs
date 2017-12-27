import pipe from './pipe';
import _ from 'lodash';
import { noop } from './helpers';

export const transformIn =
  transformer =>
    pipeline =>
      stream =>
        pipe(transformer(stream), pipeline);

export const transformOut =
  transformer =>
    pipeline =>
      stream =>
        pipe(stream, pipeline).then(transformer);

export const transformError =
  transformer =>
    pipeline =>
      stream =>
        new Pipeline()
          .main(pipeline)
          .catch(errorStream => transformer(errorStream, stream))
          .pipe(stream);

export const disconnect =
  pipeline =>
    stream =>
      noop(pipe({ ...stream }, pipeline));

/**
 * Change given stream prop to the transformer return value.
 * @param prop
 * @param transformer
 */
export const transformProp =
  (prop, transformer) =>
    pipeline =>
      (stream, close) =>
        pipeline(_.set(stream, prop, transformer(_.get(stream, prop))), close);

/**
 * Call pipeline only when case is fulfilled.
 * @param comparator {string | array | function} Comparator function or prop path (lodash path)
 * @param value {*}
 */
export const when = // TODO - find a better name (switch)
  (comparator, value) =>
    pipeline =>
      stream =>
        _.isFunction(comparator)
          ? comparator(stream) : _.get(stream, comparator) === value
            ? pipe(stream, pipeline) : noop();
