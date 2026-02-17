write a new specification document at packages/toast-bpmn/docs/specification.md this should outline an extension to the toast framework called @azerohian/toast-bpmn

- use the bpmn-moddle library to read the bpmn files https://github.com/bpmn-io/bpmn-moddle
- implement the standard triggers and utilities, ie manual, timer, typescript
- all connections must be constrained by a type, this should be extracted from the current projects types, if not found it should throw an error when loading. 
- create a chainedevent task type, this will use chainedevents decorator to extract the input and output types for validation
- there should be a assigned context type to the bpmn object, and a context decorator added the the chained event function if they do not match it should throw an error on load, this context type should inherit a base context type that should track the current process id and the step it is currently at.
- the bpmn should also have a type assigned to it that defines the input and output and the type should also define one of two execution types async or sync, This will determine whether the immediate execution context will wait for a response or it will return a success response with a message id
- it should also define if the processing should be distributed or inline. 
- if inline it should use a loop and it should process each step immediately 
- if distributed the execution of each step of the bpmn document should be processed via a worker which is initiated via bullmq. this should include the serialization and deserialization of the assigned context, there should be specific chained events to do the deserialisation and , these should be declared as const with the eventname baked in. the serialized context should be stored in redis.
- timings for each task and stacktraces should be supported for both inline and distributed processing methods
- create a xsd for extensions to bpmn xsd, this should be used to validate files before loading https://github.com/bpmn-io/bpmn-moddle/tree/main/resources/bpmn/xsd/
- make sure the document has a table of contents with start and end line numbers of each referenced section
- if required we should extend the existing toast framework to support this extension as long as it fits the current scope of the framework, this should include updating the toast/docs/specification.md with any updates