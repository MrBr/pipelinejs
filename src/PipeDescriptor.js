import _ from 'lodash';

function isValidTransformer(transformer) {
  return _.isUndefined(transformer) || _.isFunction(transformer);
}
export default class PipeDescriptor {
  /**
   * @param section {string}
   * @param pipe {function(stream, close) | Pipeline}
   * @param inTransformer {function(stream)}
   * @param outTransformer {function(result, stream)}
   * @param errTransformer {function(error, stream)}
   * @param meta {object}
   * @returns {PipeDescriptor}
   */
  constructor(section, pipe, inTransformer, outTransformer, errTransformer, meta = {}) {
    if (!pipe) {
      throw Error(`An invalid pipe provided to the PipeDescriptor for ${section} section.`);
    }

    if (!isValidTransformer(inTransformer) || !isValidTransformer(outTransformer) || !isValidTransformer(errTransformer)) {
      throw Error(`An invalid pipe provided to the PipeDescriptor for ${section} section.`);
    }

    this.arguments = arguments;
    // Interface
    this.section = section;
    this.pipe = pipe;
    this.inTransformer = inTransformer;
    this.outTransformer = outTransformer;
    this.errTransformer = errTransformer;
    this.meta = {...meta};
  }

  setup(settings) {
    _.assign(this, settings);
    return this;
  }

  replicate(customization = {}) {
    return new PipeDescriptor(...this.arguments).setup(customization);
  }
}

export const isPipeDescriptor = ref => ref instanceof PipeDescriptor;
