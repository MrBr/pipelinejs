import _ from 'lodash';
import pipe from './pipe';

export default class Pipeline {
  /**
   *
   * @param main {function}
   *  Main pipeline process
   * @param parent {Pipeline}
   */
  constructor(parent = null) {
    // TODO - handle unexpected main and parent
    this.pipes = { // Pipelines?
      supply: [],
      sink: [],
      drain: [],
      close: [],
      last: { pipe: null, type: undefined }, // TODO - confirm that only last is needed, can be pipes list
      // Create root parent to handle all undefined? effluent?
      parent,
    };
    this.pipe = this.pipe.bind(this);
  }

  // TODO - this is not needed? wrong concept
  /**
   * Used for enhance
   * @param newPipe
   * @param type
   * @returns {Pipeline}
   */
  replaceLastPipeOfType(newPipe, type) {
    const pipesCountForType = this.pipes[type].length;
    this.pipes[type][pipesCountForType - 1] = newPipe;
    return this;
  }

  /**
   *
   * @param enhancer {function}
   * @returns {Pipeline}
   */
  enhance(enhancer) { // TODO - better name
    const { type } = this.pipes.last;
    const pipe = _.last(this.pipes[type]);
    const enhancedPipe = enhancer(pipe);
    this.replaceLastPipeOfType(enhancedPipe, type);
    return this;
  }

  /**
   * Add serial pipe or pipeline.
   * @param pipe
   * @param type
   * @returns {Pipeline}
   */
  connect(...args) {
    // TODO - optimization - Adding a pipe can automatically create new array of ordered pipes
    //  further more, main pipes can be sorted?
    const pipeDescriptor = transformConnectArgsToPipeDescriptor(...args);
    const { type } = pipeDescriptor;

    this.pipes[type].push(pipeDescriptor);
    this.pipes.last = pipeDescriptor;
    return this;
  }

  disconnect() {
    
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
    const pipe = pipeDescriptor.pipe;
    // TODO - if pipeline and in serial then serial wrapper is not needed anymore when taken
    //  because pipeline is replicated with parent, meaning it is in serial
    // TODO - is it better to always replicate pipeline?
    // Lazy replicate reduces number of replicated Pipelines allowing them to behave static
    // TODO - parallel pipelines shouldn't get parent! Add test for that case!
    const pipeline = isPipeline(pipe) ? pipe.replicate() : new Pipeline(this).sink(pipe);
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
      // Removing drain does not effect this.pipes.last because
      // last is used only to create snapshot
      _.remove(this.pipes[type], pipeline);
    };
    return pipeline;
  }

  return() { // TODO - confirm name; parent?
    // TODO - handle no parent
    return this.pipes.parent;
  }

  /**
   * Deep copy.
   * Create new Pipeline that recreates all pipes as current. All references are changed, there is
   * no relation between new Pipeline and current.
   */
  replicate() {
    const pipeline = new Pipeline();

    // TODO - Rethink pipes inheritance (this particular set bellow)
    pipeline.pipes = replicatePipes(this.pipes);

    return pipeline;
  }

  serialize() {
    const { supply, sink, drain } = this.pipes;
    return [...supply, ...sink, ...drain];
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
        pipe(closedStream, this.pipes.close).then(reject).catch(reject);
      };

      const pipes = this.serialize();
      pipe(stream, pipes)
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


function transformConnectArgsToPipeDescriptor(...args) {
  const pipe = args[0];
  let type;
  let outTransformer;
  let inTransformer;
  let options = { connected: true }; // Defaults

  const argsLength = args.length;
  if (argsLength === 2) {
    type = args[1];
  } else if (argsLength === 3) {
    outTransformer = args[1];
    type = args[2];
  } else if (argsLength === 4) {
    outTransformer = args[1];
    inTransformer = args[2];
    type = args[3];
  } else if (argsLength === 5) {
    outTransformer = args[1];
    inTransformer = args[2];
    options = args[3];
    type = args[4];
  } else {
    console.log(args);
    throw Error('Trying to connect pipe with invalid arguments.');
  }

  return {
    ...options, // Options should be used to add new properties not override
    pipe,
    type,
    outTransformer,
    inTransformer,
  }
}
// Fake close, calling close doesn't affect original stream when in parallel.
export const parallel = pipe => stream => stream;

export function createSerialPipeFromPipeline(pipeline) {
  return function (stream) {
    return new Promise((resolve, reject) => pipe(stream, pipeline).then(resolve).catch(reject));
  }
}

export function replicatePipes(pipes) {
  return _.reduce(pipes, (pipesCopy, pipe, name) => {
    pipesCopy[name] = replicatePipe(pipe);
    return pipesCopy;
  }, {});
}

export function replicatePipe(pipe) {
  if (_.isArray(pipe)) {
    return pipe.map(replicatePipe)
  } else if (isPipeline(pipe)) {
    return pipe.replicate();
  }
  // TODO - handle unwanted cases
  return pipe;
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
