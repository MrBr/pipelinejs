import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { Pipeline } from '../src';

chai.use(chaiAsPromised);


// TODO
//  Working with immutability? Creating new stream reference on every process?
//  Stream is required object?
//  Bringing peace to stream "subject" property? Property that is focus of process
//  Stream interfaces? If "subject" property name vary, interface would standardise it.

function supplyX(stream) {
  return {
    ...stream,
    x: 2,
  }
}

function supplyY(stream) {
  return {
    ...stream,
    y: 4,
  }
}

function addXY(stream) {
  return {
    ...stream,
    data: stream.x + stream.y,
  }
}

function double(stream) {
  return {
    ...stream,
    data: stream.data * 2,
  };
}

function logStream(stream) {
  console.log(stream);
}

describe('Pipeline', () => {
  describe('pipe', () => {
    it('executes pipes in proper order', () => {
      // TODO - needs more asserts to confirm that it works? what tests damn it -_-
      const addXYv0 = new Pipeline();
      addXYv0
        .supply(supplyX)
        .supply(supplyY)
        .sink(addXY)
        .sink(double);

      return expect(addXYv0.pipe({})).to.eventually.deep.equal({ x: 2, y: 4, data: 12 });
        // .then(console.log);
        // .pipe(); // No stream means all data is injected?

      // Stream enhancer - format stream - Stream interface? I.E. Data stream indicates that data is focus of stream... meh
      // (stream, oldStream) => _.isPlainObject(stream) ? stream : { data: stream, ...oldStream }
    });
  });
  describe('take', () => {
      it('provides proper Pipeline', () => {
        const addXYv0 = new Pipeline(addXY);
        const supplyXPipeline = addXYv0
          .supply(supplyX)
          .take();

        expect(addXYv0.pipes.supply[0] === supplyXPipeline.pipes.sink[0]).to.be.ok;

        return expect(supplyXPipeline.pipe()).to.eventually.deep.equal({ x: 2 });

      });
  });
  describe('close', () => {
    it('closes serial pipe properly', () => {
      const addXYv0 = new Pipeline();
      addXYv0
        .supply(supplyX)
        .supply((stream, close) => (close(stream)))
        .sink(addXY)
        .sink(double);

      return expect(addXYv0.pipe()).to.eventually.deep.equal({ x: 2 });
    });
    it('closes parallel pipe properly', () => {
      const pipeline = new Pipeline();
      const pipeSetX2 = new Pipeline()
        .supply((stream, close) => {
          !stream.setX && close();
        })
        .sink(() => ({ x: 2 }));
      const pipeSetY3 = new Pipeline()
        .supply((stream, close) => {
          !stream.setY && close();
        })
        .sink(() => ({ y: 3 }));

      pipeline.sink(pipeSetX2);
      pipeline.sink(pipeSetY3);

      const stream1 = pipeline
        .pipe({ setX: true });
      const stream2 = pipeline
          .pipe({ setY: true });

      return Promise.all([
        expect(stream1).to.eventually.deep.equal({ x: 2 }),
        expect(stream2).to.eventually.deep.equal({ y: 3 })
      ]);
    });
  });
  describe('clone', () => {
    // Example of saving partial functionality // TODO - copy -> create new ref without modifying original
    // const doubleXYSum = addXYv0
    //   .clone() // TODO - or copy?
    //   .supply(supplyX)
    //   .supply(supplyY)
    //   .sink(double)
    //   .take();
  });
});
