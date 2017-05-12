import _ from 'lodash';

export default class PipeDescriptor {
  create(...args) {
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

    return this.setup({
      ...options, // Options should be used to add new properties not override
      pipe,
      type,
      outTransformer,
      inTransformer,
    });
  }

  setup(settings) {
    _.assign(this, settings);
    return this;
  }

  replicate(customization = {}) {
    return new PipeDescriptor().setup(this).setup(customization);
  }
}

export const isPipeDescriptor = ref => ref instanceof PipeDescriptor;
