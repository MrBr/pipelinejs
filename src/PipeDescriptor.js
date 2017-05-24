import _ from 'lodash';
import { pick } from './transformers/in';
import { append } from './transformers/out';

const defaultMeta = { connected: true };

function resolveInTransformer(transformer) {
  return _.isString(transformer) ? pick(transformer) : transformer;
}

function resolveOutTransformer(transformer) {
  return _.isString(transformer) ? append(transformer) : transformer;
}

export default class PipeDescriptor {
  constructor() {
    // Interface
    this.type;
    this.pipe;
    this.inTransformer;
    this.outTransformer;
    this.errTransformer;
    this.meta;
  }

  setup(settings) {
    _.merge(this, settings);
    return this;
  }

  /**
   * Create Pipe descriptor.
   * Process arguments optional values to required type.
   *
   * @param type {string}
   * @param pipe {function | Pipeline}
   * @param inTransformer {string | function}
   *  A string is converted to the pick transformer, a function is left as is.
   * @param outTransformerArg {string | function(result, stream)}
   *  A string is converted to the append transformer, a function is left as is.
   * @param errTransformerArg {string | function}
   *  Same as the outTransformer.
   * @param extra {object}
   * @returns {PipeDescriptor}
   */
  create(type, pipe, inTransformerArg, outTransformerArg, errTransformerArg, extra = {}) {
    if (!pipe) {
      throw Error(`An invalid pipe provided to the PipeDescriptor for ${type} type.`);
    }

    const meta = { ...extra, ...defaultMeta}; // Additional info

    const inTransformer = resolveInTransformer(inTransformerArg);
    const outTransformer = resolveOutTransformer(outTransformerArg);
    const errTransformer = resolveOutTransformer(errTransformerArg);

    return this.setup({
      type,
      pipe,
      inTransformer,
      outTransformer,
      errTransformer,
      meta,
    });
  }

  args(newSetup = {}) {
    const {
      type,
      pipe,
      inTransformer,
      outTransformer,
      errTransformer,
      meta,
    } = _.merge({}, this, newSetup);

    return [type, pipe, inTransformer, outTransformer, errTransformer, meta];
  }

  replicate(customization = {}) {
    return new PipeDescriptor().setup(this).setup(customization);
  }
}

export const isPipeDescriptor = ref => ref instanceof PipeDescriptor;
