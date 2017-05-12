import _ from 'lodash';
import PipeDescriptor, { isPipeDescriptor } from './PipeDescriptor';
import pipe from './pipe';
import parallel from './parallel';
import serial from './serial';

export default class Pipeline {
  /**
   * @param pipe {Pipeline}
   * @param parent {Pipeline}
   */
  constructor(parent = null, pipe) {
    // TODO - handle unexpected main and parent
    const sink = pipe ? [pipe] : [];
    this.pipes = { // Pipelines?
      supply: [],
      sink: sink,
      drain: [],
      close: [],
      last: null, // TODO - confirm that only last is needed, can be pipes list
      // Create root parent to handle all undefined? effluent?
      parent,
    };
    this.pipe = this.pipe.bind(this);
  }

  /**
   * Add a pipe or a pipeline to the time zone.
   * @param pipe
   * @param type
   * @returns {Pipeline}
   */
  connect(...args) {
    // TODO - optimization - Adding a pipe can automatically create new array of ordered pipes
    //  further more, main pipes can be sorted?
    const pipeDescriptor = new PipeDescriptor().create(...args);
    const { type } = pipeDescriptor;

    this.pipes[type].push(pipeDescriptor);
    this.pipes.last = pipeDescriptor;
    return this;
  }

  parent(parent) {
    this.pipes.parent = parent;
  }

  /**
   * Before the main drain, used to filter out unwanted streams
   * or supply stream with data.
   * @param pipe
   * @returns {*}
   */
  supply(...args) {
    return this.connect(...args, 'supply');
  }

  /**
   * Used to process the stream.
   * @param pipe
   * @returns {*}
   */
  sink(...args) {
    return this.connect(...args, 'sink');
  }

  /**
   * After the main drain and sink pipes, used to check? processed stream.
   * @param pipe
   * @returns {*}
   */
  drain(...args) {
    return this.connect(...args, 'drain');
  }

  close(...args) {
    return this.connect(...args, 'close');
  }

  /**
   * Either return new pipeline reference or create new from pipe.
   * @returns {*}
   */
  take() {
    // TODO - is it clear that "take" returns only last pipeline which doesn't have previous pipelines?
    const pipeDescriptor = this.pipes.last;

    if (!pipeDescriptor) {
      return null;
    }

    const pipe = pipeDescriptor.replicate({ type: 'sink' });
    // TODO - if pipeline and in serial then serial wrapper is not needed anymore when taken
    //  because pipeline is replicated with parent, meaning it is in serial
    // TODO - is it better to always replicate pipeline?
    // Lazy replicate reduces number of replicated Pipelines allowing them to behave static
    // TODO - parallel pipelines shouldn't get parent! Add test for that case!
    const pipeline = isPipeline(pipe) ? pipe : new Pipeline(this, pipe);
    pipeline.parent(this);

    // TODO - Add tests
    // TODO - Bit strange way to change pipe in chain? it is strange because by mutating last
    //  chain is changed?
    // Replace old pipe.
    // If old pipe wouldn't be replaced, pipe modification
    // after take() would not affect piped stream.
    pipeDescriptor.pipe = pipeline;

    // TODO - rethink disconnect/remove binding
    pipeline.remove = () => {
      // Removing a pipe does not effect this.pipes.last because
      // last is used only to create snapshot
      _.remove(this.pipes[type], pipeline);
    };
    return pipeline;
  }

  /**
   * Add a pipe to the last pipe in the chain of the last pipe -_-
   * Recursively find the last pipe in the chain which doesn't have last pipe.
   * @param pipe
   * @returns {Pipeline}
   */
  chain(pipe) {
    const last = this.take();
    if (last) {
      last.chain(pipe);
    } else {
      this.drain(pipe);
    }
    return this;
  }

  return() { // TODO - confirm name; parent?
    // TODO - handle no parent
    return this.pipes.parent;
  }

  /**
   * Deep copy.
   * Create the new Pipeline that recreates all pipes as current.
   * All references are changed, there is no relation between
   * the new Pipeline and the current.
   */
  replicate() {
    const pipeline = new Pipeline();

    // TODO - Rethink pipes inheritance (this particular set bellow)
    pipeline.pipes = replicatePipes(this.pipes);

    return pipeline;
  }

  getSections() {
    const { supply, sink, drain } = this.pipes;
    return [supply, sink, drain];
  }

  /**
   * Pipeline is serial if it has parent and whenever it is connected to another pipeline.
   * It can explicitly be disconnected (connected in parallel) for certain fitting (connection).
   * @param stream
   * @returns {Promise}
   */
  pipe(stream = {}) {
    const promise = new Promise((resolve, reject) => {
      const closePipeline = closedStream => {
        // TODO - closing can not be stopped (closed again), improve this to prevent that case?
        // TODO - is closing only important for serial pipes?
        parallel(closedStream, this.pipes.close).then(reject).catch(reject);
      };

      const sections = this.getSections();

      _.reduce(sections, (nextPromise, section) => {
        return nextPromise.then((stream) => parallel(stream, section));
      }, Promise.resolve(stream))
        .then(resolve)
        .catch(closePipeline);
    });

    // Place to catch possible real errors
    // Primary added to remove unhandled promise warning.
    // Rejection in Pipeline does not necessary indicate error. It can just be early return.
    promise.catch(console.log);

    return promise;
  }
}

export function replicatePipes(pipes) {
  return _.reduce(pipes, (pipesCopy, pipe, name) => {
    pipesCopy[name] = replicatePipe(pipe);
    return pipesCopy;
  }, {});
}

export function replicatePipe(pipe) {
  if (isPipeline(pipe)) {
    return pipe.replicate();
  } else if (isPipeDescriptor(pipe)) {
    return pipe.replicate();
  } else if (_.isFunction(pipe)) {
    return pipe;
  } else if (_.isNull(pipe)) {
    return pipe;
  }
  throw Error('Trying to replicate an invalid pipe: ', pipe);
}

export const isPipeline = ref => ref instanceof Pipeline;

/**
 * Inverse always call pipe as serial.
 * It doesn't have sense to use inverse in case something is connected in parallel.
 * Parallel pipes doesn't affect original stream.
 * @param pipe
 * @returns {Function}
 */
export const inverse = nextPipe => stream =>
  new Promise((resolve, reject) => {
    pipe(stream, nextPipe).then(reject).catch(resolve)
  });
