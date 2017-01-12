import _ from 'lodash';
import Stream from './Stream';

export default class Pipeline {
  /**
   *
   * @param main {function}
   *  Default fitting doesn't do nothing it is just
   *  here to enable other pipes to connect
   * @param parent {Pipeline}
   *  Default manifold handle all "unhandled - not properly connected or root?" pipes
   */
  constructor(main = fitting, parent = manifold) {
    // TODO - handle unexpected main and parent
    this.pipes = { // Pipelines?
      supply: [],
      sink: [main],
      drain: [],
      last: null, // TODO - confirm that only last is needed, can be pipes list
      // Create root parent to handle all undefined? effluent?
      parent,
    };
  }

  connect(pipe, type) {
    const pipeline = isPipeline(pipe) ? pipe : new Pipeline(pipe, this);
    pipeline.disconnect = () => {
      // Removing drain does not effect this.pipes.last because
      // last is used only to create snapshot
      _.remove(this.pipes[type], pipeline);
    };
    // TODO - optimization - Adding a pipe can automatically create new array of ordered pipes
    //  further more, main pipes can be sorted?
    this.pipes[type].push(pipeline);
    this.pipes.last = pipeline;
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
    return this.pipes.last;
  }

  return() {
    // TODO - handle no parent or manifold parent (it self)
    return this.pipes.parent;
  }

  /**
   * Create new Pipeline with all same pipes same references but different top fitting?.
   * Look at it like pipeline got another drain which is returned to work with.
   * Changing provided pipeline will not affect original from which it split, but changing original
   * pipeline pipes will affect new one.
   *
   * TODO - what happens when pipeline is removed?
   * Shallow copy?
   * Should really new drain be returned?
   */
  split() { // TODO - confirm name
    // TODO -
  }

  /**
   * Clone || duplicate || copy
   * Create new Pipeline that recreates all pipes as current. All references are changed, there is
   * no relation between new Pipeline and current.
   *
   * Deep copy?
   */
  copy() { // TODO - confirm name
    // TODO - implement copy functionality
  }

  pipe(stream = {}, close) {
    const { supply, sink, drain } = this.pipes;

    // New array must be created to brake reference with Pipeline pipes.
    // Pipeline pipes may be changed while piping but it may not affect already started piping.
    const pipelineSnapshot = [...supply, ...sink, ...drain];

    // TODO - rethink Stream concept; it is not needed? wrongly named?
    return new Stream(pipelineSnapshot, close).pipe(stream);
  }
}

export const isPipeline = ref => ref instanceof Pipeline;
export const manifold = new Pipeline(); // TODO - confirm name
export const fitting = (stream) => undefined;
