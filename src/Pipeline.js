import _ from 'lodash';
import PipeDescriptor, { isPipeDescriptor } from './PipeDescriptor';
import pipe from './pipe';
import parallel from './parallel';

export default class Pipeline {
  /**
   * @param parent {Pipeline}
   */
  constructor(parent = null) {
    // TODO - handle unexpected main and parent
    this.pipes = {
      input: [],
      main: [],
      output: [],
      catch: [],
    };

    this.last = null;
    this.parent = parent;

    this.pipe = this.pipe.bind(this);
  }

  /**
   * Add a pipe or a pipeline to the time zone.
   * When connecting pipe descriptor it will be connected to the initial type? // TODO - confirm
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

    this.last = pipeDescriptor;

    return this;
  }

  /**
   * Before the main pipes, used to filter out unwanted streams
   * or supply stream with data.
   * @param pipe
   * @returns {*}
   */
  input(...args) {
    return this.connect('input', ...args);
  }

  /**
   * Used to process the stream.
   * @param pipe
   * @returns {*}
   */
  main(...args) {
    return this.connect('main', ...args);
  }

  /**
   * After the stream is processed, last pipes in order.
   * @param pipe
   * @returns {*}
   */
  output(...args) {
    return this.connect('output', ...args);
  }

  catch(...args) {
    return this.connect('catch', ...args);
  }

  getInputPipes() {
    return [];
  }

  getOutputPipes() {
    return [];
  }

  replace(pipeDescriptor, newPipeDescriptor) {
    const { type } = pipeDescriptor;
    const { type: newType } = newPipeDescriptor;

    if (type !== newType) {
      throw Error(`Trying to replace ${type} with ${newType}`);
    }

    const pipes = this.pipes[type];
    const index = _.indexOf(pipes, pipeDescriptor);

    pipes[index] = newPipeDescriptor;
  }

  /**
   *
   * @param enhancer {function}
   * @returns {Pipeline}
   */
  enhance(enhancer) {
    const { last: lastPipe } = this;
    const pipe = enhancer(lastPipe.pipe);
    const enhancedPipe = lastPipe.replicate({ pipe });
    this.replace(lastPipe, enhancedPipe);
    return this;
  }

  /**
   * Either return new pipeline reference or create new from pipe.
   * @returns {*}
   */
  take() {
    // TODO - is it clear that "take" returns only last pipeline which doesn't have previous pipelines?
    const pipeDescriptor = this.last;

    if (!pipeDescriptor) {
      throw Error('Trying to take the last pipe in an empty Pipeline');
    }

    const pipeline =  new Pipeline(this).connect(...pipeDescriptor.args({ type: 'main' }));

    // TODO - Add tests
    const newPipeDescriptor = new PipeDescriptor().create(pipeDescriptor.type, pipeline);
    this.replace(pipeDescriptor, newPipeDescriptor);
    // TODO - optimization - add to the last.meta "replicated" flag so that it is safe to mutate it.
    // Is "replicated" flag secure enough that it can be mutate? What are the cases new copy is needed?
    this.last = newPipeDescriptor;

    // TODO - rethink disconnect/remove binding
    pipeline.remove = () => {
      // Removing a pipe does not effect this.pipes.last because
      // last is used only to create snapshot
      _.remove(this.pipes[pipeDescriptor.type], newPipeDescriptor);
    };

    return pipeline;
  }

  /**
   * Add a pipe to the last pipe in the chain of the last pipe -_-
   * Recursively find the last pipe in the chain which doesn't have last pipe.
   * Because pipes in the same sector may not depended on each other we can relay to chain
   * related pipes to the output.
   * @param pipe
   * @returns {Pipeline}
   */
  chain(...args) {
    const last = isPipeDescriptor(_.tail(args)) ? args.pop() : this.take();
    const lastOutputs = last.pipes.output;
    if (_.isEmpty(lastOutputs)) {
      last.output(...args);
    } else {
      // "take()" is needed to avoid mutating existing pipeline
      const lastOutput = _.tail(lastOutputs).take();
      last.chain(...args, lastOutput);
    }
    return this;
  }

  return() { // TODO - confirm name; parent?
    // TODO - handle no parent
    return this.parent;
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
    pipeline.pipes = this.replicatePipes();

    return pipeline;
  }

  replicatePipes() {
    return _.reduce(this.pipes, (pipesCopy, pipes, name) => {
      pipesCopy[name] = replicatePipes(pipes);
      return pipesCopy;
    }, {});
  }

  compose() {
    const { input, main, output } = this.pipes;
    return [input, ...this.getInputPipes(), main, ...this.getOutputPipes(), output];
  }

  /**
   * Pipeline is serial if it has parent and whenever it is connected to another pipeline.
   * It can explicitly be disconnected (connected in parallel) for certain fitting (connection).
   * @param stream
   * @returns {Promise}
   */
  pipe(stream = {}) {
    const promise = new Promise((resolve, reject) => {
      const catchPipeline = errorStream => {
        // Closing catch error will end catch cycle
        parallel(errorStream, this.pipes.catch).then(reject).catch(reject);
      };

      const sections = this.compose();

      _.reduce(sections, (nextPromise, section) => {
        return nextPromise.then((stream) => parallel(stream, section));
      }, Promise.resolve(stream))
        .then(resolve)
        .catch(catchPipeline);
    });

    // Place to catch possible real errors
    // Primary added to remove unhandled promise warning.
    // Rejection in Pipeline does not necessary indicate error. It can just be early return.
    promise.catch(console.log);

    return promise;
  }
}

export function replicatePipes(pipes) {
  return _.map(pipes, replicatePipe);
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
