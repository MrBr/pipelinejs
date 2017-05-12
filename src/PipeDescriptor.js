import _ from 'lodash';

export default class PipeDescriptor {
  constructor() {
    // Interface
    this.pipe;
    this.outTransformer;
    this.inTransformer;
    this.meta;
    this.type;
  }

  setup(settings) {
    _.merge(this, settings);
    return this;
  }

  create(...args) {
    const pipe = args[0];
    let type;
    let outTransformer;
    let inTransformer;
    let meta = { connected: true }; // Additional info

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
      meta = args[3];
      type = args[4];
    } else {
      console.log(args);
      throw Error('Trying to connect pipe with invalid arguments.');
    }

    return this.setup({
      pipe,
      outTransformer,
      inTransformer,
      meta,
      type,
    });
  }

  args(newSetup = {}) {
    const { pipe, outTransformer, inTransformer, meta, type } = _.merge({}, this, newSetup);
    return [pipe, outTransformer, inTransformer, meta, type];
  }

  replicate(customization = {}) {
    return new PipeDescriptor().setup(this).setup(customization);
  }
}

export const isPipeDescriptor = ref => ref instanceof PipeDescriptor;
