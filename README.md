# Pipeline

## The idea

Application "architect" should be the only one to combine (couple) services (functions) into meaningful system (the application).

Functions shouldn't know about each other. Consider functions (pipes), like tools you use to build a product. In real life tools don't depend mutually by default. Worker use or combine tools as needed, and that is the main goal of the Pipeline.

Pipeline gives you the mechanism to combine functions and create flows which all together create an application. 

## Basic concepts

-- intro sentence;

Pipes are used to build pipelines. Pipes are placed in sections. The section represents order of execution.

Pipeline has 3 core sections: input => main => output

* input - First in order of execution, used to filter unwanted streams or to supply stream with additional data
* main - Second in order of execution, the core of any pipeline, used to process stream, do what ever it has to do (side effect, calculation...)
* output - Third and last in order of execution, used to check results of stream processing

Additional catch section is used to process closing (error) stream. Catch pipes output will be actual error stream. Consider catch as a special case section.

A section can have multiple pipes but must be mutually independent. Independent pipes doesn't modify the same stream property!

Pipes execution:

* Pipes in the same section are executed in parallel.
* Sections are executed serially, one after the other. Only when all pipes in one sections are resolved stream is passed to the next section.

Work on the stream by mutating it. Stream may be mutated because:

* Pipes in the same section must be independent, they shouldn't modify on the same stream property.
* Pipes may not persist the stream (are stateless) meaning different sections are independent.

Passing the stream down the flow:

* Returning the `undefined` will pass the current stream. 
* Promises are integrated in the Pipeline. Returning `thenable` will wait for it to complete and pass the stream based on the resolved value. Same rules apply to the resolved value as to the non promise values.  
* Returning other values will pass that value as the new stream.

Pseudo example
```javascript
// Update user route
const updateUserService =
  new Pipeline()

    // Input section
    // All pipes are executed in parallel
    // If any pipe closes (throws) other sections are skipped but catch.
    .input(userExists)
    .input(validateUserData)
    .input(getUser)

    // Main section
    // All is good, update user
    .main(updateUser)

    // Output section
    // User is updated, format the response
    .output(formatSuccessResponse)

    // Catch Section
    // Catchs any error and format the error response
    .catch(formatErrorResponse)

// Called when request recieved
updateUserService
  .pipe(userUpdateData)
    .then(sendResponse)
    .catch(sendResponse);

```

## Roadmap

**Long term**

* Get feedback
* Tests, tests, tests :scream;

**Short term**

* Add missing examples
* Document advanced concepts
* Clean up code (document)
