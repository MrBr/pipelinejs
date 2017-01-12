import _ from 'lodash';
import { isPipeline } from './Pipeline';

export default class Stream {
  /**
   * @param pipelines {array}
   * @param close {function} (optional)
   *  Parent close handle. Passing parent close makes parent and current stream coupled.
   *  Closing current stream will close parent.
   */
  constructor(pipelines, close) {
    this.pipelines = pipelines; // Does not change for the stream
    this.flows = true;
    this.parentClose = close;
    this.close = this.close.bind(this);
  }

  /**
   * Close the current stream.
   * If coupled with parent stream, parent stream will also be closed.
   */
  close() {
    this.flows = false;
    if (this.parentClose) {
      this.parentClose();
    }
  }

  isClosed() {
    return !this.flows;
  }

  resolvePipe(pipeline) { // TODO - better name
    if (isPipeline(pipeline)) {
      // TODO - find better way then creating new function (optimization)
      return pipeline.pipe.bind(pipeline);
    } else if (_.isFunction(pipeline)) {
      // Main pipe
      return pipeline;
    }
    return undefined;
  }

  pipe(stream, index = 0) {
    return new Promise((resolve, reject) => {
      const pipeline = this.pipelines[index];
      // Only when stream is piped through nextPipe resolve current.
      // This creates recursive mechanism resolving all from bottom to top.
      // Final effect is pipes serialization.
      const nextPipe = (nextStream = stream)=> {
        if (this.isClosed()) {
          this.close();
          return;
        }
        this.pipe(nextStream, index + 1).then(resolve);
      };

      // Is Pipe
      const pipe = this.resolvePipe(pipeline);

      if (!pipe) {
        // No more pipelines or pipes, resolve
        resolve(stream);
      }

      const newStream = pipe(stream, this.close);

      if (_.isUndefined(newStream)) { // TODO - newStream === stream?
        // Main pipe that is fitting
        // Parallel, nothing is done on the stream that consider current flow
        // This means that pipes can be both serial and parallel in the same time
        nextPipe(stream);
      } else if (newStream instanceof Promise) {
        // Main pipe that has async behavior
        // TODO - Catch error (reject)
        newStream.then(nextPipe);
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
}
