## `pipe(stream, pipe): Promise`

(Adapter) Implements piping logic. Defines the pipe interface.
Use `pipe` to properly pipe a stream through a pipe or a Pipeline.

**Arguments**

* stream {any}
    Data passed through the pipeline.
* pipe {function(stream, close) | Pipeline}
    Pipe is a handle that process given stream.
    Pipe can close stream (stop the propagation) either by using `close` handle provided by `pipe` function or by throwing an Error.
    Pipeline can be used as a pipe.

**Closing the stream (error)**

Pipe gets `close` handle as the second argument. Call `close` to end flow with passed argument as error stream. 
