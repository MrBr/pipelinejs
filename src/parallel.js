import pipe from './pipe';
import _ from 'lodash';

export default function parallel(stream, pipes, reconsiler) {
  if (_.isEmpty(pipes)) {
    return Promise.resolve(stream);
  }

  return new Promise((resolve, reject) => {
    Promise.all(_.map(pipes, pipeDescriptor => pipe(stream, pipeDescriptor)))
      .then(resolvedStreams => resolve(reconsiler(stream, resolvedStreams)))
      .catch(reject);
  });
}
