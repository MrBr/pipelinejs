import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { Pipeline, inverse, pipeClosedStreamToDrain, parallel } from '../src';

chai.use(chaiAsPromised);

// TODO
//  Separate Pipeline and Stream tests
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

describe('Pipeline', () => {
  describe('pipe', () => {
    it('executes pipes in proper order', () => {
      // TODO - needs more asserts to confirm that it works? what tests damn it -_-
      const addXYv0 = new Pipeline();
      addXYv0
        .supply(supplyX)
        .supply(supplyY)
        .sink(addXY)
          .chain(double);

      return expect(addXYv0.pipe({})).to.eventually.deep.equal({ x: 2, y: 4, data: 12 });
    });
    describe('lifecycle', () => {
      it('async pipe rejects only once', () => {
        // Note: Had case when it was rejected twice
        const drain = sinon.spy(() => {});

        const supplyPipeline = new Pipeline();
        supplyPipeline.supply(function () {
          return new Promise(function (resolve, reject) {
            // throw new Error({});
            reject({ error: 'Or is it?' });
          });
        });

        const pipeline = new Pipeline();
        pipeline
          .supply(inverse(supplyPipeline))
          .drain(drain);

        return pipeline
          .pipe()
          .then(() => expect(drain.callCount).to.be.equal(1));
      });
      it('async pipe resolves only once', () => {
        const drain = sinon.spy(() => {});
        const supplyPipeline = new Pipeline();
        supplyPipeline.supply(function () {
          return new Promise(function (resolve, reject) {
            resolve({});
          });
        });

        const pipeline = new Pipeline();
        pipeline
          .supply(supplyPipeline)
          .drain(drain);

        return pipeline
          .pipe()
          .then(() => expect(drain.callCount).to.be.equal(1));
      });
    });
  });
  describe('take', () => {
      it('provides proper Pipeline', () => {
        const addXYv0 = new Pipeline().sink(addXY);
        const supplyXPipeline = addXYv0
          .supply(supplyX)
          .take();

        expect(addXYv0.pipes.supply[0].pipe).to.be.deep.equal(supplyXPipeline);

        return expect(supplyXPipeline.pipe()).to.eventually.deep.equal({ x: 2 });
      });
  });
  describe('close', () => {
    // TODO - rename close to return so that it makes more sense to use it, to be associated
    //  with early return, which it actually is?
    it('calls closing pipes when closing', () => {
      const closePipe1 = (stream) => ({ ...stream, close1: true });
      const closePipe2 = (stream) => ({ ...stream, close2: true });

      const pipeline = new Pipeline();
      pipeline
        .supply((stream, close) => close())
        .close(closePipe1)
        .close(closePipe2);

      const closedPipeline = new Pipeline().supply(inverse(pipeline));

      const expectedStream = { close1: true, close2: true };
      return expect(closedPipeline.pipe({})).to.eventually.be.deep.equal(expectedStream);
    });
    it('closes serial pipe properly', () => {
      const addXYv0 = new Pipeline();
      addXYv0
        .supply(supplyX)
        .supply((stream, close) => close('error'))
        .sink(addXY)
        .sink(double);

      return expect(inverse(addXYv0)({})).to.eventually.deep.equal('error');
    });
    it('closes parallel pipe properly', () => {
      const errorMessage1 = 'error1';
      const errorMessage2 = 'error2';
      const pipeSetX2 = new Pipeline()
        .supply((stream, close) => {
          !stream.setX && close(errorMessage1);
          return;
        })
        .sink(() => ({ x: 2 }));
      const pipeSetY3 = new Pipeline()
        .supply((stream, close) => {
          !stream.setY && close(errorMessage2);
          return;
        })
        .sink(() => ({ y: 3 }));

      const pipeline = new Pipeline();
      pipeline
        .sink(pipeSetX2)
        .sink(pipeSetY3);

      const stream1 = pipeline
        .pipe({ setX: true });
      const stream2 = pipeline
        .pipe({ setY: true });

      return Promise.all([
        expect(stream1).to.eventually.be.rejected.then(error => {
          expect(error).to.be.equal(errorMessage2)
        }),
        expect(stream2).to.eventually.be.rejected.then(error => {
          expect(error).to.be.equal(errorMessage1);
        }),
      ]);
    });
  });
  describe('chain', () => {
    it('chained pipes execute synchronous', () => {
      const pipeline = new Pipeline()
        .supply((stream) => ({ ...stream, x: 2}))
          .chain((stream) => ({ ...stream, x: stream.x + 2 }))
            .chain((stream) => ({ ...stream, x: stream.x + 2 }))
        .sink((stream) => ({ ...stream , third: stream.x / 3}));

      const expectedStream = { x: 6, third: 2 };
      return expect(pipeline.pipe({})).to.eventually.deep.equal(expectedStream);
    });
  });
});
