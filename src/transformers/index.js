import { noop } from '../helpers';

export const getOldStream =
  prop =>
    (newStream, oldStream) =>
      noop(oldStream[prop] = newStream[prop], oldStream);

export const addNewStreamToOldAs =
  prop =>
    (newStream, oldStream) =>
      noop(oldStream[prop] = newStream, oldStream);

export const addErrStreamToOldAs =
  prop =>
    (errStream, oldStream) =>
      noop(oldStream[prop] = errStream, oldStream);
