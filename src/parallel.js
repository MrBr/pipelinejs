import pipe from './pipe';
import _ from 'lodash';

export default (stream, pipes) => {
  if (_.isEmpty(pipes)) {
    return Promise.resolve(stream);
  }
  return new Promise((resolve, reject) => {
    Promise.all(_.map(pipes, pipeDescriptor => pipe(stream, pipeDescriptor)))
      .then(resolvedStreams => {
        const resolvedStream = _.assign.apply(null, resolvedStreams);
        resolve(resolvedStream)
      })
      .catch(reject);
  });
}
