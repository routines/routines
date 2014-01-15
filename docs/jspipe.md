

<!-- Start src/jspipe.js -->

# Running concurrent code

### job(fn, args)

Run a generator function `fn` as a concurrent job.

##### Example:
```
var pipe = new JSPipe.Pipe();

JSPipe.job(function* () {
    pipe.send(1);
});

JSPipe.job(function* () {
    while (true) {
        yield JSPipe.timeout(250).get();
        pipe.send(2);
    }
});

JSPipe.job(function* () {
   while (true) {
       yield JSPipe.timeout(400).get();
       pipe.send(3);
   }
});

JSPipe.job(function* () {
    var data;
    while (data = yield pipe.get()) {
        console.log(data);
    }
});
```

To communicate and synchronize between jobs, send data through a `Pipe`
using `put` (or `send`) and receive data using `get`.

##### Params: 

* **Function** *fn* A generator function to execute as a concurrent job

* **Array** *args* Parameters to pass to `fn`

# Communicating &amp; synchronizing between jobs

### Pipe

A pipe provides a way for two jobs to communicate data and synchronize their execution.
One job can send data into the pipe by calling `yield pipe.put(data)` or `pipe.send(data)`
and another job can receive data by calling `yield pipe.get()`.

Once both a sender job and a receiver job are waiting on the pipe a rendezvous occurs,
transferring the data in the pipe to the receiver and consequently synchronizing the two
waiting jobs.

Once synchronized, the two jobs continue execution.

##### Example:
```
var pipe = new Pipe();
```

### Pipe.close()

Mark the pipe as closed.

### Pipe.put(data)

Call `yield pipe.put(data)` from a job (the sender) to put data in the pipe.

The put method will then try to rendezvous with a receiver job, if any.
If there is no receiver waiting for data, the sender will pause until another
job calls `yield pipe.get()`, which will then trigger a rendezvous.

##### Example
```
job(function* () {
    yield pipe.put(42);
});
```

##### Params: 

* **AnyType** *data* The data to put into the pipe.

### Pipe.get()

Call `yield pipe.get()` from a job (the receiver) to get data from the pipe.

The get method will then try to rendezvous with a sender job, if any.
If there is no sender waiting for the data it sent to be delivered, the receiver will
pause until another job calls `yield pipe.put(data)`, which will then trigger
a rendezvous.

##### Example:
```
job(function* () {
    var data;
    while (data = yield pipe.get()) {
        console.log(data);
    }
});
```

##### Return:

* **AnyType** The data that was received from the pipe.

### Pipe.send(data)

Like `put`, but non-blocking. Unlike `put`, do not call with `yield`.

##### Example:
```
pipe.send(42);
```

##### Params: 

* **AnyType** *data* The data to put in the pipe.

---

### EventPipe

An EventPipe is a pipe for delivering event data.

##### Example:

```
var pipe = new EventPipe(document, &#39;keydown&#39;, function(evt) {
    pipe.send(evt);
});
```

Normally you should use the `listen` function to create an EventPipe instead.

##### Params: 

* **Object** *el* An object, such as an HTMLElement, that exposes an addEventListener method.

* **String** *type* The name of the event, e.g. &#39;keydown&#39;.

* **Function** *handler* The function that is called when the event fires.

### EventPipe.close()

Removes the event listener and closes the Pipe.

# Making pipes

### timeout(ms)

NOTE: will probably get renamed to `pause`.

Create a pipe that receives a value after a specified time. Use `timeout`
to pause a `job`. Other jobs get a chance to execute this job is paused. 

##### Example:

```
job(function* () {
    yield timeout(200).get();
    console.log(&#39;200ms elapsed&#39;);
});
```

##### Params: 

* **Number** *ms* The time to wait before a value is placed in the pipe

##### Return:

* **Pipe** A pipe

### listen(el, type, preventDefault)

Create a `Pipe` that receives event data.

##### Example:

```
var pipe = listen(document, &#39;keydown&#39;);
var keydownEventData = yield pipe.get();
console.log(keydownEventData);
```

##### Params: 

* **Object** *el* The object, such as an HTMLElement, on which to listen for events

* **String** *type* The name of the event, e.g. &#39;keydown&#39;

* **Boolean** *preventDefault* Whether or not `.preventDefault()` should be called

##### Return:

* **Pipe** A pipe

### lazyseq(count, fn)

Creates a pipe with `count` elements, each produced by executing the function `fn`.

##### Example:

```
var pipe = lazyseq(5, function(i) { return i * 10; });

job(function* () {
    var data,
        result = [];

    while (data = yield pipe.get()) {
        result.push(data);
    }

    console.log(result);
});
```
Prints `[0, 10, 20, 30, 40]` to console.

##### Params: 

* **Number** *count* The number of elements that should be produced

* **Function** *fn* The function that produces each element. It is invoked with

### denode(fn, args)

Creates a `Pipe` that will get the data produced by a callback-invoking NodeJS
function.

Useful for converting callback style code into sequential code.

##### Example:

```
job(function* () {
    var filedata = yield denode(fs.readFile, &#39;readme.txt&#39;);
    console.log(filedata);
});
```

##### Params: 

* **Function** *fn* A node function that invokes a callback, e.g. fs.readFile

* **Array** *args* The arguments to supply to `fn`

## Transforming pipes

### unique(pipe)

Takes a pipe and produces a new pipe that only receives sequentially unique
values.

##### Example:

```
var pipe1 = new Pipe(),
    pipe2 = unique(pipe1);

pipe1.send(1);
pipe1.send(1);
pipe1.send(3);
pipe1.send(1);

job(function* () {
    var data,
        result = [];
    while (data = yield pipe2.get()) {
        result.push(data);
    }
    console.log(result);
});

```
Prints `[1, 3, 1]` to console.

##### Params: 

* **Pipe** *pipe* The pipe from which sequentially unique values must be produced

##### Return:

* **Pipe** A Pipe

### pace(ms, pipe)

Produces a new pipe that gets data from a source pipe at a given pace.

##### Params: 

* **Number** *ms* The time to wait before getting the next value from the source pipe

* **Pipe** *pipe* The source pipe

##### Return:

* **Pipe** A pipe

<!-- End src/jspipe.js -->

