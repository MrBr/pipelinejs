import _ from 'lodash';
import { flow } from './Stream';

export default class Pipeline {
  /**
   *
   * @param main {function}
   *  Main pipeline process
   * @param parent {Pipeline}
   */
  constructor(parent) {
    // TODO - handle unexpected main and parent
    this.pipes = { // Pipelines?
      supply: [],
      sink: [],
      drain: [],
      last: null, // TODO - confirm that only last is needed, can be pipes list
      // Create root parent to handle all undefined? effluent?
      parent,
    };
  }

  connect(pipe, type) {
    // TODO - optimization - Adding a pipe can automatically create new array of ordered pipes
    //  further more, main pipes can be sorted?
    this.pipes[type].push(pipe);
    this.pipes.last = pipe;
    return this;
  }

  /**
   * Before the main drain, used to filter or extend stream.
   * @param pipe
   * @returns {*}
   */
  supply(pipe) {
    return this.connect(pipe, 'supply');
  }

  /**
   * Immediately after the main drain, used to process stream.
   * @param pipe
   * @returns {*}
   */
  sink(pipe) {
    return this.connect(pipe, 'sink');
  }

  /**
   * After the main drain and sink pipes, used to check? processed stream.
   * @param pipe
   * @returns {*}
   */
  drain(pipe) {
    return this.connect(pipe, 'drain');
  }

  take() {
    // TODO - is it clear that "take" returns only last pipeline which doesn't have previous pipelines?
    const pipe = this.pipes.last;
    const pipeline = isPipeline(pipe) ? pipe : new Pipeline(this).sink(pipe);

    // TODO - rethink disconnect binding
    pipeline.disconnect = () => {
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
   * Some kind of shallow copy.
   * Create new Pipeline with all same pipes same references but different top fitting?.
   * Look at it like pipeline got another drain which is returned to work with.
   * Changing provided pipeline will not affect original from which it split, but changing original
   * pipeline pipes will affect new one.
   * When branching you can connect pipeline to another parent.
   * TODO - what happens when pipeline is removed?
   * @param parent {Pipeline}
   */
  branch(parent) {
    return new Pipeline(parent).supply(this);
  }

  /**
   * Deep copy.
   * Create new Pipeline that recreates all pipes as current. All references are changed, there is
   * no relation between new Pipeline and current.
   * When replicating you can connect pipeline to another parent.
   * @param parent {Pipeline}
   */
  replicate(parent) {
    const pipeline = new Pipeline(parent);

    const pipes = replicatePipes(this.pipes);
    // TODO - Rethink pipes inheritance
    pipeline.pipes = pipes;

    return pipeline;
  }

  serialize() {
    const { supply, sink, drain } = this.pipes;
    return [...supply, ...sink, ...drain];
  }

  /**
   *
   * @param stream
   * @param close
   * @returns {Promise}
   */
  pipe(stream = {}) {
    return new Promise((resolve, reject) => {
      // TODO - rethink Stream concept; it is not needed? wrongly named?
      flow(stream, this.serialize())
        .then(resolve)
        // Parent must be taken separately for each piping
        // because it may be dynamically changed?
        // TODO - should parent be static?
        .catch(this.return() ? reject : resolve);
    });
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
    return pipe.map(replicatePipes)
  } else if (isPipeline(pipe)) {
    return pipe.replicate();
  }
  // TODO - handle unwanted cases
  return pipe;
}

export const isPipeline = ref => ref instanceof Pipeline;
