import pipe from './pipe';
import _ from 'lodash';

function reconcileResolvedStreams(resolvedStreams) {
  return _.assign.apply(null, resolvedStreams);
}

export default (stream, pipes) => {
  if (_.isEmpty(pipes)) {
    return Promise.resolve(stream);
  }
  return new Promise((resolve, reject) => {
    Promise.all(_.map(pipes, pipeDescriptor => pipe(stream, pipeDescriptor)))
      .then(resolvedStreams => resolve(reconcileResolvedStreams(resolvedStreams)))
      .catch(reject);
  });
}
