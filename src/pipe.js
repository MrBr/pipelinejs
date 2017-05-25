import _ from 'lodash';
import { isPipeline } from './Pipeline';
import { isPipeDescriptor } from './PipeDescriptor';

function isThenable(p) { return !!p && typeof p.then === 'function'; }

/**
 * Pipes in pipeline can be functions (pipes) or pipeline (multiple pipes connected).
 * When piping stream pipe is needed.
 * @param pipeline
 * @returns {*}
 */
function getPipe(pipeline) { // TODO - better name
  if (isPipeline(pipeline)) {
    return pipeline.pipe;
  } else if (_.isFunction(pipeline)) {
    return pipeline;
  } else if (isPipeDescriptor(pipeline)) {
    return getPipe(pipeline.pipe);
  }
  throw Error('Trying to get a pipe from the invalid pipeline.');
}

// TODO - use enhancers for the stream transformation?
// Using enhancers for transformation makes pipeline writing more complex
// but "pipe" is getting simpler.
// Transformers are for now special case and they exists for every stream type.
// Transformers should be used as AdHoc solution for reusing pipes more easily.
function transformInStream(stream, pipeDescriptor) {
  const { inTransformer } = pipeDescriptor;
  return inTransformer ? inTransformer(stream) : stream;
}

function transformOutStream(newStream, stream, pipeDescriptor) {
  const { outTransformer } = pipeDescriptor;
  return outTransformer ? outTransformer(newStream, stream) : newStream;
}

function transformErrStream(errStream, stream, pipeDescriptor) {
  const { errTransformer } = pipeDescriptor;
  return errTransformer ? errTransformer(errStream, stream) : errStream;
}

/**
 * Premise.
 * Instead passing next as argument, close is passed. Reason behind it is optimistic approach.
 * More frequent case should be continuing the flow, not closing, for that reason
 * simpler should be to continue then to stop.
 */

// TODO - close as third arg? Document
//    Not needed because called pipe will get new close handle
//    and rejected promise behave like close.
export default (stream, currentPipeDescriptor) => {
  return new Promise((resolve, reject) => {
    const currentPipe = getPipe(currentPipeDescriptor);
    const inStream = transformInStream(stream, currentPipeDescriptor);

    // Returning undefined passes the same stream further into the chain.
    // This makes functions easier to write because the stream is usually mutated,
    // thus there is no need to explicitly pass it through.
    const resolvePipe = (nextStream = stream) =>
      resolve(transformOutStream(nextStream, stream, currentPipeDescriptor));

    let closed = false;
    // Close flow so that newStream doesn't go further.
    const closePipe = closedStream => {
      // Helps handle both async and sync flows.
      closed = true;
      reject(transformErrStream(closedStream, stream, currentPipeDescriptor));
    };

    const newStream = currentPipe(inStream, closePipe);

    if (closed) {
      // Closed with closePipe function (It means close flow already started).
      // It is a bit hidden relation but it simplifies closing pattern.
      // Removes need to return anything when closing.
      return;
    }

    // TODO - invalidate close after stream is piped (either sync or async)
    //  Once stream is piped close SHOULD NOT be called!

    if (isThenable(newStream)) {
      newStream.then(resolvePipe).catch(closePipe);
    } else {
      resolvePipe(newStream);
    }
  });
}
