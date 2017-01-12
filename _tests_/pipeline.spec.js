import { assert } from 'chai';
import { Pipeline } from '../src';


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
    it('executes pipes in proper order', (done) => {
      // TODO - needs more asserts
      const addXYv0 = new Pipeline(addXY);
      addXYv0
        .supply(supplyX)
        .supply(supplyY)
        // .sink(logStream)
        .sink(double)
        // .drain(logStream)
        .drain(function (stream) {
          assert.equal(12, stream.data);
          done();
        });

      // Same thing as above
      const addXYv1 = new Pipeline();
      addXYv1
        .supply(supplyX)
        .supply(supplyY)
        .sink(addXY)
        .sink(double)
        .drain(logStream);

      addXYv0
        .pipe({})
        // .then(console.log);
        // .pipe(); // No stream means all data is injected?

      // Stream enhancer - format stream - Stream interface? I.E. Data stream indicates that data is focus of stream... meh
      // (stream, oldStream) => _.isPlainObject(stream) ? stream : { data: stream, ...oldStream }
    });
  });
  describe('take', () => {
      it('provides proper Pipeline', (done) => {
        const addXYv0 = new Pipeline(addXY);
        const supplyXPipeline = addXYv0
          .supply(supplyX)
          .take();

        assert.isOk(addXYv0.pipes.supply[0] === supplyXPipeline);

        supplyXPipeline
          .drain(function (stream) {
            assert.equal(2, stream.x);
            done();
          })
          .pipe();
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
