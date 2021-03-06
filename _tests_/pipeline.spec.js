import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { Pipeline, inverse, pipeClosedStreamToDrain, parallel } from '../src';
import { pick } from '../src/in-transformers';

chai.use(chaiAsPromised);

// TODO
//  Separate Pipeline and Stream tests

function inputX(stream) {
  return {
    ...stream,
    x: 2,
  }
}

function inputY(stream) {
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
        .input(inputX)
        .input(inputY)
        .main(addXY)
          .chain(double); // TODO - move to chain tests

      return expect(addXYv0.pipe({})).to.eventually.deep.equal({ x: 2, y: 4, data: 12 });
    });
    describe('lifecycle', () => {
      it('async pipe rejects only once', () => {
        // Note: Had case when it was rejected twice
        const output = sinon.spy(() => {});

        const inputPipeline = new Pipeline();
        inputPipeline.input(function () {
          return new Promise(function (resolve, reject) {
            // throw new Error({});
            reject({ error: 'Or is it?' });
          });
        });

        const pipeline = new Pipeline();
        pipeline
          .input(inverse(inputPipeline))
          .output(output);

        return pipeline
          .pipe()
          .then(() => expect(output.callCount).to.be.equal(1));
      });
      it('async pipe resolves only once', () => {
        const output = sinon.spy(() => {});
        const inputPipeline = new Pipeline();
        inputPipeline.input(function () {
          return new Promise(function (resolve, reject) {
            resolve({});
          });
        });

        const pipeline = new Pipeline();
        pipeline
          .input(inputPipeline)
          .output(output);

        return pipeline
          .pipe()
          .then(() => expect(output.callCount).to.be.equal(1));
      });
    });
  });
  describe('take', () => {
      it('provides proper Pipeline', () => {
        const addXYv0 = new Pipeline().main(addXY);
        const inputXPipeline = addXYv0
          .input(inputX)
          .take();

        expect(addXYv0.pipes.input[0].pipe).to.be.deep.equal(inputXPipeline);

        return expect(inputXPipeline.pipe()).to.eventually.deep.equal({ x: 2 });
      });
  });
  describe('catch', () => {
    it('calls catch pipes when closing', () => {
      const closePipe1 = (stream) => ({ ...stream, close1: true });
      const closePipe2 = (stream) => ({ ...stream, close2: true });

      const pipeline = new Pipeline();
      pipeline
        .input((stream, close) => close())
        .catch(closePipe1)
        .catch(closePipe2);

      const closedPipeline = new Pipeline().input(inverse(pipeline));

      const expectedStream = { close1: true, close2: true };
      return expect(closedPipeline.pipe({})).to.eventually.be.deep.equal(expectedStream);
    });
    it('closes serial pipe properly', () => {
      const addXYv0 = new Pipeline();
      addXYv0
        .input(inputX)
        .input((stream, close) => close('error'))
        .main(addXY)
        .main(double);

      return expect(inverse(addXYv0)({})).to.eventually.deep.equal('error');
    });
    it('closes parallel pipe properly', () => {
      const errorMessage1 = 'error1';
      const errorMessage2 = 'error2';
      const pipeSetX2 = new Pipeline()
        .input((stream, close) => {
          !stream.setX && close(errorMessage1);
          return;
        })
        .main(() => ({ x: 2 }));
      const pipeSetY3 = new Pipeline()
        .input((stream, close) => {
          !stream.setY && close(errorMessage2);
          return;
        })
        .main(() => ({ y: 3 }));

      const pipeline = new Pipeline();
      pipeline
        .main(pipeSetX2)
        .main(pipeSetY3);

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
    it('propagates thrown error through pipes', () => {
      const errorCatch = sinon.spy(() => {});

      const topPipeline = new Pipeline();
      const middlePipeline = new Pipeline();
      const bottomPipeline = new Pipeline();

      topPipeline.catch(errorCatch);

      bottomPipeline.main((stream, close) => stream.test());
      middlePipeline.main(bottomPipeline);
      topPipeline.main(middlePipeline);

      return expect(topPipeline.pipe({})).to.eventually.be.rejected.then(error => {
        expect(errorCatch.callCount).to.be.equal(1);
      });
    });
  });
  describe('chain', () => {
    it('execute pipes synchronous', () => {
      const pipeline = new Pipeline()
        .input((stream) => ({ ...stream, x: 2}))
          .chain((stream) => ({ ...stream, x: stream.x + 2 }))
            .chain((stream) => ({ ...stream, x: stream.x + 2 }))
        .main((stream) => ({ ...stream , third: stream.x / 3}));

      const expectedStream = { x: 6, third: 2 };
      return expect(pipeline.pipe({})).to.eventually.deep.equal(expectedStream);
    });
    it('chains pipe with transformers', () => {
      const pipeline = new Pipeline()
        .main(stream => { stream.x = stream.x * 2})
          .chain(x => x + 1, pick('x'), x => ({x}))

      return expect(pipeline.pipe({ x: 5 })).to.eventually.deep.equal({ x: 11 });
    });
  });
  describe('enhance', () => {
    it('wraps pipe with enhancer and returns expected value', () => {
      const enhancedStream = { val: 1 };
      const enhancer = pipeline => stream => enhancedStream;
      const responsePipeline = new Pipeline();
      responsePipeline
        .output(() => {})
        .enhance(enhancer);

      // It is not the same reference because of the stream reconciliation
      return expect(responsePipeline.pipe({})).to.eventually.deep.equal(enhancedStream);
    });
  });
  describe('replicate', () => {
    it('replicates an empty pipeline', () => {
      const pipeline = new Pipeline();

      const replicatedPipeline = pipeline.replicate();

      expect(replicatedPipeline instanceof Pipeline).to.be.ok;
    });
    it('replicates a pipeline with pipes', () => {
      const pipeline = new Pipeline();
      pipeline
        .main(() => {})
        .output(() => {});

      const replicatedPipeline = pipeline.replicate();

      expect(replicatedPipeline instanceof Pipeline).to.be.ok;
      expect(replicatedPipeline.pipes.main.length === 1).to.be.ok;
      expect(replicatedPipeline.pipes.output.length === 1).to.be.ok;
    });
    it('adds a pipe to the replicated pipeline', () => {
      const pipeline = new Pipeline();

      const replicatedPipeline = pipeline.replicate();
      replicatedPipeline
        .main(() => {})
        .output(() => {});

      expect(replicatedPipeline instanceof Pipeline).to.be.ok;
      expect(replicatedPipeline.pipes.main.length === 1).to.be.ok;
      expect(replicatedPipeline.pipes.output.length === 1).to.be.ok;
    });
  });
});
