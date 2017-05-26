# Pipeline || PipelineJS

Write an application by writing its topology and using independent micro services.

## Documentation

The main thing to understand the meaning of input, main and out, those `pipes` are used to construct pipeline. 
There is no difference in their type or interface, they are only executed in different order and with different purpose. 

Pipeline structure

| input => main => output |

* input - First in order of execution, used to filter unwanted streams or to input stream with additional data
* main - Second in order of execution, the core of any pipeline, used to process stream, do what ever it has to do (side effect, calculation...)
* output - Third and last in order of execution, used to check results of stream processing

Pipeline can have as many as you like pipes (of any kind).

Stream may be mutated in any pipe because

1. Pipes in the same section must be independent, they shouldn't work on the same part of the stream. 
2. Pipes may not persist a state (may not keep the stream) meaning different sections are free to mutate the stream, their order of execution allows the mutation. 

* Pipes in same sections are executed in parallel, the state mutation is allowed because of the first rule. 
* Sections are executed in serial, the state mutation is allowed because of the second rule.

Achieving flow diversion (branch) can be done just by chaining pipes. To branch flow wrap first pipe with switch (conditional pipe).
// TODO - implement switch helper `switch(prop1 || comparator, prop2)` -> stream.prop1 ? stream.prop2 || stream.prop1 ? getValue(stream);

## Pipeline.catch

Used only with serial pipes, where closedStream is kept in pipes.

## Pipeline.catch

Used only with serial pipes, where closedStream is kept in pipes.

### Thinking the Pipeline way. 

Everything can be anything and everything can have something before or after core process or be core process it self.

Your application snapshot or topology is static, it always is, pipeline enables you to create that topology very easy and clean.

## Example - please refer to test to see example

## Helpers

Can be function, creator, high order. // TODO - explain each one

### Pipes
### Enhancers
### Transformers
### Helpers

Namings:
* Filter
* Supply | Selector
* Handle | Process | Action
* Next | PostProcess
