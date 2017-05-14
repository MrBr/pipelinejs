# Pipeline || PipelineJS

Write an application by writing its topology and using independent micro services.

## Documentation

Main thing is to understand meaning of supply, sink and drain, those `pipes` are used to construct pipeline. 
There is no difference in their type or interface, they are only executed in different order and with different purpose. 

Pipeline structure

| supply pipes => sink pipes => drain pipes |

* supply - First in order of execution, used to filter unwanted streams or to supply stream with additional data
* sink - Second in order of execution, the core of any pipeline, used to process stream, do what ever it has to do (side effect, calculation...)
* drain - Third and last in order of execution, used to check results of stream processing

Pipeline can have as many as you like pipes (of any kind).

Pipes can be connected to the Pipeline in serial or parallel. Depending on what is returned by certain pipe it is differently connected. Returning `undefined` means it is parallel, returning new `stream` means it is in serial. Promises are supported, same logic is applied to resolved data.

Adding pipe to Pipeline will create new Pipeline which can be taken shaped separately.

## Pipeline.close

Used only with serial pipes, where closedStream is kept in pipes.

### Thinking the Pipeline way. 

Everything can be anything and everything can have something before or after core process or be core process it self.

Your application snapshot or topology is static, it always is, pipeline enables you to create that topology very easy and clean.

## Example - please refer to test to see example

## Helper handles

Can be function, creator, high order. // TODO - explain each one

### Pipes
### Enhancers
### Transformers
### Helpers // TODO - some other name

## Roadmap, concerns

There are still few things to be specified more precisely, primary determining if some implicit (conventional) things should be kept the way  they are or changed to be explicit.

Naming is to be improved, depending to much on a real piping systems.

Stream interface (convention). Should it always be an object or primitive values are to be accepted as well?

Closing pipe can be done with promise and with close callback? Yes, but only one way should be used.

Find out if more common case is that Pipelines (and pipes) are connected in serial or parallel.

Wrappers hide original pipeline, making it hard to extend its functionality, that is why they need to have special status. It must be possible to get wrapped instance.
Either they will have special interface or will be attached specially, prefer to keep them as normal functions.

Stream can be anything, but it should be only one argument.


Namings:
* Filter
* Supply | Selector
* Handle | Process | Action
* Next | PostProcess
