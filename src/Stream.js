import _ from 'lodash';
import { isPipeline } from './Pipeline';

function resolvePipe(pipeline) { // TODO - better name
  if (isPipeline(pipeline)) {
    // TODO - find better way then creating new function (optimization)
    return pipeline.pipe.bind(pipeline);
  } else if (_.isFunction(pipeline)) {
    // Main pipe
    return pipeline;
  }
  return undefined;
}

export function flow(stream, pipelines, close, index = 0) { // TODO - rename (and this file)
  return new Promise((resolve, reject) => {
    const pipeline = pipelines[index];
    const closePipe = closedStream => {
      close && close();
      reject(closedStream);
    };
    // Only when stream is piped through nextPipe resolve current.
    // This creates recursive mechanism resolving all from bottom to top.
    // Final effect is pipes serialization.
    // Current implementation handles undefined resolved stream as parallel,
    // meaning passing old one next.
    const nextPipe = (nextStream = stream) => flow(nextStream, pipelines, close, index + 1)
      .then(resolve)
      .catch(closePipe);

    // Is Pipe
    const pipe = resolvePipe(pipeline);

    if (!pipe) {
      // No more pipelines or pipes, resolve
      resolve(stream);
    }

    const newStream = pipe(stream, closePipe);

    if (_.isUndefined(newStream)) { // TODO - newStream === stream?
      // Main pipe that is fitting
      // Parallel, nothing is done on the stream that consider current flow
      // This means that pipes can be both serial and parallel in the same time
      nextPipe(stream);
    } else if (newStream instanceof Promise) {
      // Main pipe that has async behavior
      // TODO - Catch error (reject)
      newStream.then(nextPipe).catch(closePipe);
    } else if (_.isPlainObject(newStream)) {
      // Main pipe that has synchronous behavior
      nextPipe(newStream);
    } else {
      // TODO - waste?
      // Error - nextStream must be undefined (parallel drain), plain object or promise
      resolve(newStream);
    }
  });
}

