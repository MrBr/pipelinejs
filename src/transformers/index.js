export const oldStream =
  prop =>
    (newStream, oldStream) =>
      noop(oldStream[prop] = newStream[prop], oldStream);
