import _ from 'lodash';
import PipeDescriptor, {isPipeDescriptor} from './PipeDescriptor';
import {parallel, serial} from './helpers';

const defaultMeta = {connected: true};

export default class Pipeline {
    /**
     * @param parent {Pipeline}
     */
    constructor(name, parent) {
        this.pipes = {
            main: [],
            catch: [],
        };

        this.last = null;
        this.parent = parent;
        this.name = name;

        this.pipe = this.pipe.bind(this);
    }

    toJSON() {
        return JSON.stringify({name: this.name, parent: this.parent});
    }

    /**
     * Add a pipe or a pipeline to the section.
     * @returns {Pipeline}
     */
    connect(pipeDescriptor) {
        // TODO - optimization - Adding a pipe can automatically create new array of ordered pipes

        const {section} = pipeDescriptor;
        this.pipes[section].push(pipeDescriptor);

        this.last = pipeDescriptor;

        return this;
    }

    /**
     * @link PipeDescriptor
     */
    compose(section, pipe, inTransformer, outTransformer, errTransformer, meta) {
        return new PipeDescriptor(
            section,
            pipe,
            inTransformer,
            outTransformer,
            errTransformer,
            meta
        );
    }

    addPipe(...args) {
        args[1] = isPipeline(args[1]) ? args[1].replicate() : args[1];
        const pipeDescriptor = this.compose(...args);
        return this.connect(pipeDescriptor);
    }

    main(...args) {
        return this.addPipe('main', ...args);
    }

    catch(...args) {
        return this.addPipe('catch', ...args);
    }

    replace(pipeDescriptor, newPipeDescriptor) {
        const {section} = pipeDescriptor;
        const {section: newType} = newPipeDescriptor;

        if (section !== newType) {
            throw Error(`Trying to replace ${section} with ${newType}`);
        }

        const pipes = this.pipes[section];
        const index = _.indexOf(pipes, pipeDescriptor);

        pipes[index] = newPipeDescriptor;

        if (this.last === pipeDescriptor) {
            this.last = newPipeDescriptor;
        }
    }

    /**
     *
     * @param enhancer {function}
     * @returns {Pipeline}
     */
    enhance(enhancer) {
        const {last} = this;
        const pipe = enhancer(last.pipe);
        const enhancedPipe = last.replicate({pipe});
        this.replace(last, enhancedPipe);
        return this;
    }

    /**
     * Return new pipeline from the last added pipe/pipeline.
     * @returns {*}
     */
    take() {
        // TODO - disallow take().take() - throw error
        const pipeDescriptor = this.last;

        if (!pipeDescriptor) {
            throw Error('Trying to take the last pipe in an empty Pipeline');
        }

        return this.takePipe(pipeDescriptor);
    }

    takePipe(pipeDescriptor) {
        if (isPipeline(pipeDescriptor.pipe)) {
            return pipeDescriptor.pipe;
        }

        const pipeline = new Pipeline(undefined, this).connect(pipeDescriptor.replicate());

        // TODO - Add tests
        const newPipeDescriptor = this.compose(pipeDescriptor.section, pipeline);
        this.replace(pipeDescriptor, newPipeDescriptor);

        // TODO - rethink disconnect/remove binding
        pipeline.remove = () => {
            _.remove(this.pipes[pipeDescriptor.section], newPipeDescriptor);
        };

        return pipeline;
    }

    /**
     * Use to achieve serial connection between multiple pipes.
     * Add a pipe to the last pipe in the chain of the last pipe -_-
     * Recursively find the last pipe in the chain which doesn't have last pipe (any main pipe).
     * TODO - handle case when there is more main pipes; provide selector? default is last in main
     * Because pipes in the same sector may not depended on each other we can relay to chain
     * related pipes to the main.
     * @param pipe
     * @returns {Pipeline}
     */
    chain(...args) {
        const last = this.take();
        last.main(...args);
        return this;
    }

    return() { // TODO - confirm name; parent?
        if (!this.parent) {
            throw Error(
                'Returning to the unexisting parent pipeline. ' +
                'Use the `return` only when a pipeline has the parent. ' +
                'Common case for using the `return` is to get back to parent ' +
                'pipeline after a child has been taken with the `take`.'
            );
        }
        return this.parent;
    }

    /**
     * Deep copy.
     * Create the new Pipeline that recreates all pipes as current.
     * All references are changed, there is no relation between
     * the new Pipeline and the current.
     */
    replicate() {
        const pipeline = new Pipeline();

        // TODO - Rethink pipes inheritance (this particular set)
        pipeline.pipes = this.replicatePipes();

        return pipeline;
    }

    replicatePipes() {
        return _.reduce(this.pipes, (pipesCopy, pipes, name) => {
            pipesCopy[name] = replicatePipes(pipes);
            return pipesCopy;
        }, {});
    }

    /**
     * Pipeline is serial if it has parent and whenever it is connected to another pipeline.
     * It can explicitly be disconnected (connected in parallel) for certain fitting (connection).
     * @param stream
     * @returns {Promise}
     */
    pipe(stream = {}) {
        const promise = new Promise((resolve, reject) => {
            const catchPipeline = errorStream => {
                // Closing catch error will end catch cycle
                parallel(errorStream, this.pipes.catch)
                    .then(reject)
                    .catch(reject);
            };

            const mainPipes = this.pipes.main;

            serial(stream, mainPipes)
                .then(resolve)
                .catch(catchPipeline);
        });

        // Primary added to remove unhandled promise warning.
        // Catch is handled before, this is just a helper promise.
        // TODO - find good way to handle this
        promise.catch(() => {});

        return promise;
    }
}

export function replicatePipes(pipes) {
    return _.map(pipes, replicatePipe);
}

export function replicatePipe(pipe) {
    if (isPipeline(pipe)) {
        return pipe.replicate();
    } else if (isPipeDescriptor(pipe)) {
        return pipe.replicate();
    } else if (_.isFunction(pipe)) {
        return pipe;
    } else if (_.isNull(pipe)) {
        return pipe;
    }
    throw Error(`Trying to replicate an invalid pipe: ${pipe}`);
}

export const isPipeline = ref => ref instanceof Pipeline;
