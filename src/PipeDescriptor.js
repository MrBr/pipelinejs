import _ from 'lodash';

const defaultMeta = { connected: true };

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

  create(type, pipe, inTransformer, outTransformer, errTransformer, extra = {}) {
    const meta = { ...extra, ...defaultMeta}; // Additional info

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
