import pipe from './pipe';
import _ from 'lodash';

export const noop = (expression, returnValue) => returnValue;

export function parallel(stream, pipes) {
  if (_.isEmpty(pipes)) {
    return Promise.resolve(stream);
  }

  return Promise.all(_.map(pipes, pipeDescriptor => pipe(stream, pipeDescriptor)));
}

export function serial(stream, pipes, index = 0) {
  const pipeDescriptor = pipes[index];

  if (!pipeDescriptor) {
    return Promise.resolve(stream);
  }

  return new Promise((resolve, reject) => {
    const next = nextStream => serial(nextStream, pipes, index + 1).then(resolve);

    pipe(stream, pipeDescriptor).then(next).catch(reject);
  })
}
