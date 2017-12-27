import _ from 'lodash';
import PipeDescriptor, { isPipeDescriptor } from './PipeDescriptor';
import { parallel } from './helpers';

const defaultMeta = { connected: true };

export default class Pipeline {
  /**
   * @param parent {Pipeline}
   */
  constructor(parent = null) {
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
   * Add a pipe or a pipeline to the section.
   * @returns {Pipeline}
   */
  connect(pipeDescriptor) {
    // TODO - optimization - Adding a pipe can automatically create new array of ordered pipes

    const { section } = pipeDescriptor;
    this.pipes[section].push(pipeDescriptor);

    this.last = pipeDescriptor;

    return this;
  }

  /**
   * @link PipeDescriptor
   */
  compose(section, pipe, inTransformer, outTransformer, errTransformer, meta) {
    return new PipeDescriptor(
      section,
      pipe,
      inTransformer,
      outTransformer,
      errTransformer,
      meta
    );
  }

  composeAndConnect(...args) {
    const pipeDescriptor = this.compose(...args);
    return this.connect(pipeDescriptor);
  }

  /**
   * Before the main pipes, used to filter out unwanted streams
   * or supply stream with data.
   * @param pipe
   * @returns {*}
   */
  input(...args) {
    return this.composeAndConnect('input', ...args);
  }

  /**
   * Used to process the stream.
   * @param pipe
   * @returns {*}
   */
  main(...args) {
    return this.composeAndConnect('main', ...args);
  }

  /**
   * After the stream is processed, last pipes in order.
   * @param pipe
   * @returns {*}
   */
  output(...args) {
    return this.composeAndConnect('output', ...args);
  }

  catch(...args) {
    return this.composeAndConnect('catch', ...args);
  }

  getInputPipes() {
    return [];
  }

  getOutputPipes() {
    return [];
  }

  replace(pipeDescriptor, newPipeDescriptor) {
    const { section } = pipeDescriptor;
    const { section: newType } = newPipeDescriptor;

    if (section !== newType) {
      throw Error(`Trying to replace ${section} with ${newType}`);
    }

    const pipes = this.pipes[section];
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
   * Return new pipeline from the last added pipe/pipeline.
   * @returns {*}
   */
  take() {
    // TODO - disallow take().take() - throw error
    const pipeDescriptor = this.last;

    if (!pipeDescriptor) {
      throw Error('Trying to take the last pipe in an empty Pipeline');
    }

    const pipeline =  new Pipeline(this).connect(pipeDescriptor.replicate({ section: 'main' }));

    // TODO - Add tests
    const newPipeDescriptor = this.compose(pipeDescriptor.section, pipeline);
    this.replace(pipeDescriptor, newPipeDescriptor);
    // TODO - optimization - add to the last.meta "replicated" flag so that it is safe to mutate it.
    // Is "replicated" flag secure enough that it can be mutate? What are the cases new copy is needed?
    this.last = newPipeDescriptor;

    // TODO - rethink disconnect/remove binding
    pipeline.remove = () => {
      _.remove(this.pipes[pipeDescriptor.section], newPipeDescriptor);
    };

    return pipeline;
  }

  /**
   * Use to achieve serial connection between multiple pipes.
   * Add a pipe to the last pipe in the chain of the last pipe -_-
   * Recursively find the last pipe in the chain which doesn't have last pipe (any output pipe).
   * TODO - handle case when there is more output pipes; provide selector? default is last in output
   * Because pipes in the same sector may not depended on each other we can relay to chain
   * related pipes to the output.
   * @param pipe
   * @returns {Pipeline}
   */
  chain(...args) {
    const last = isPipeDescriptor(_.last(args)) ? args.pop() : this.take();
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
    if (!this.parent) {
      throw Error(
        'Returning to the unexisting parent pipeline. ' +
        'Use the `return` only when a pipeline has the parent. ' +
        'Common case for using the `return` is to get back to parent ' +
        'pipeline after a child has been taken with the `take`.'
      );
    }
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

    // TODO - Rethink pipes inheritance (this particular set)
    pipeline.pipes = this.replicatePipes();

    return pipeline;
  }

  replicatePipes() {
    return _.reduce(this.pipes, (pipesCopy, pipes, name) => {
      pipesCopy[name] = replicatePipes(pipes);
      return pipesCopy;
    }, {});
  }

  serialize() {
    const { input, main, output } = this.pipes;
    return [input, ...this.getInputPipes(), main, ...this.getOutputPipes(), output];
  }

  reconcileStreams(stream, resolvedStreams) {
    if (!_.isObject(stream)) {
      throw Error('Input stream must be an object!');
    }

    const invalidStream = _.find(
        resolvedStreams,
        resolvedStream => !_.isPlainObject(resolvedStream)
    );
    if (invalidStream) {
        throw Error(`Output stream must be an object or undefined! Invalid stream value: ${JSON.stringify(invalidStream)}`);
    }

    return _.assign({}, ...resolvedStreams);
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
        parallel(errorStream, this.pipes.catch, this.reconcileStreams)
          .then(reject)
          .catch(reject);
      };

      const sections = this.serialize();

      _.reduce(sections, (nextPromise, section) => {
        return nextPromise.then((stream) => parallel(stream, section, this.reconcileStreams));
      }, Promise.resolve(stream))
        .then(resolve)
        .catch(catchPipeline);
    });

    // Primary added to remove unhandled promise warning.
    // Catch is handled before, this is just a helper promise.
    // TODO - find good way to handle this
    promise.catch(() => {});

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
  throw Error(`Trying to replicate an invalid pipe: ${pipe}`);
}

export const isPipeline = ref => ref instanceof Pipeline;
