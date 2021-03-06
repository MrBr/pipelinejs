## Tools

Tools are predefined functions that are commonly used.

This document explains what kind of tools exists, how they behave and where to find them.

Set of commonly used tools:

* [pipes](#pipes)
* [helpers](#helpers)
* [enhancers](#enhancers)
* [transformers](#transformers)

Reusable tools are either creators or High Order tools.

* Tool creator
    A function that takes arguments and create new tool with static operation. 
* High order tool
    Special case of creator. Takes exiting tool and creates new by changing its behavior.

### <a id='pipes'></a> Pipes

Pipe creators and HOP (High order pipes).

Find at [`pipes.js`](../src/pipes.js).

### <a id='enhancers'></a> Enhancers

Enhancer creators and HOE (High order enhancers).

Find at [`enhancers.js`](../src/enhancers.js).

### <a id='transformers'></a> Transformers

Transformer creators and HOT (High order transformers), they are grouped by the type.

Input transformers [`in-transformers.js`](../src/transformers/in). Used as `inTransformer` for the pipe.

Output transformers [`out-transformers.js`](../src/transformers/out). Used as `outTransformer` and `errTransformer`.

Difference exists because of different signature.

### <a id='helpers'></a> Helpers

Tools used to write the pipeline way more easily.

Find at [`helpers.js`](../src/helpers).
