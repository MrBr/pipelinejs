import _ from 'lodash';
import { isPipeline } from './Pipeline';

/**
 * Pipes in pipeline can be functions (pipes) or pipeline (multiple pipes connected).
 * When piping stream pipe is needed.
 * @param pipeline
 * @returns {*}
 */
function resolvePipe(pipeline) { // TODO - better name
  if (isPipeline(pipeline)) {
    return pipeline.pipe;
  } else if (_.isFunction(pipeline)) {
    return pipeline;
  }
  // pipeline = pipelineDescriptor
  return resolvePipe(pipeline.pipe);
}

function transformOutStream(newStream, stream, pipeDescriptor) {
  const { outTransformer } = pipeDescriptor;
  return outTransformer ? outTransformer(newStream, stream) : newStream;
}

function transformInStream(stream, pipeDescriptor) {
  const { inTransformer } = pipeDescriptor;
  return inTransformer ? inTransformer(stream) : stream;
}

/**
 * Premise.
 * Instead passing next as argument, close is passed. Reason behind it is optimistic approach.
 * More frequent case should be continuing flow, not closing, for that reason,
 * simpler should be to continue then to stop.
 */

export default function pipe(stream, pipeline, index = 0) {
  // TODO - remove new promise overhead for sync returns; use Promise.resolve || .reject
  return new Promise((resolve, reject) => {
    // Pipeline descriptor or pipe (a function or a pipeline) - TODO - standardise
    const currentPipeDescriptor = _.isArray(pipeline) ? pipeline[index] : pipeline;

    if (!currentPipeDescriptor) {
      // No more pipes, resolve
      resolve(stream);
      return;
    }

    const currentPipe = resolvePipe(currentPipeDescriptor);
    const inStream = transformInStream(stream, currentPipeDescriptor);

    let closed = false;
    // Close flow so that newStream doesn't go further.
    const closePipe = (closedStream = stream) => {
      // Helps handle both async and sync flows.
      closed = true;

      reject(closedStream);
    };

    // Only when stream is piped through nextPipe resolve current.
    // This creates recursive mechanism resolving all from bottom to top.
    // Final effect is pipes serialization.
    const nextPipe =
      nextStream =>
        pipe(transformOutStream(nextStream, stream, currentPipeDescriptor), pipeline, index + 1)
          .then(resolve)
          // It is not needed to check here if flow is closed because nextPipe is only going
          // to be called if previous passed or it was in parallel.
          .catch(closePipe);

    const newStream = currentPipe(inStream, closePipe);

    if (closed) {
      // Closed with closePipe function (It means close flow already started).
      // It is a bit hidden relation but it simplifies closing pattern.
      // Removes need to return anything when closing.
      return;
    }

    // TODO - invalidate close after stream is piped (either sync or async)
    //  Once stream is piped close SHOULD NOT be called!

    if (_.isUndefined(newStream)) {
      // TODO - newStream === stream?
      //  Trying to preserve as much as possible JS practices
      //  Early return of `undefined` is one of them when nothing is done?
      //  However, returning same object would be more explicit.
      nextPipe(stream);
    } else if (newStream instanceof Promise) {
      newStream.then(nextPipe).catch(closePipe);
    } else if (_.isPlainObject(newStream)) {
      nextPipe(newStream);
    } else {
      console.log('Invalid stream, must be object, undefined or promise.');
      console.log('Stream value: ', newStream);
      console.log('Pipe: ', pipeline);
      closePipe(newStream);
    }
  });
}

