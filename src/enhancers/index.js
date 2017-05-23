import pipe from '../pipe';

export const transformIn =
  transformer =>
    pipeline =>
      (stream, close) =>
        pipeline(transformer(stream), close);

export const transformOut =
  transformer =>
    pipeline =>
      (stream, close) =>
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
      noop(pipeline({ ...stream }, () => {}));

/**
 * Change given stream prop to the transformer return value.
 * @param prop
 * @param transformer
 */
export const transformProp =
  (prop, transformer) =>
    pipeline =>
      stream =>
        noop(_.set(stream, prop, transformer(stream)));
