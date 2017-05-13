import pipe from './pipe';

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
      (stream, close) =>
        pipeline(stream, errorStream => close(transformer(errorStream)));
