

<!-- Start src/jspipe.js -->

## job(fn, args)

Run a generator function `fn` as a concurrent job.

#### Example:
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

### Params: 

* **Function** *fn* A generator function to execute as a concurrent job

* **Array** *args* Parameters to pass to `fn`

## Pipe

A pipe provides a way for two jobs to communicate data and synchronize their execution.
One job can send data into the pipe by calling `yield pipe.put(data)` or `pipe.send(data)`
and another job can receive data by calling `yield pipe.get()`.

Once both a sender job and a receiver job are waiting on the pipe a rendezvous occurs,
transferring the data in the pipe to the receiver and consequently synchronizing the two
waiting jobs.

Once synchronized, the two jobs continue execution.

#### Example:
```
var pipe = new Pipe();
```

## Pipe.close()

Mark the pipe as closed.

## Pipe.put(data)

Call `yield pipe.put(data)` from a job (the sender) to put data in the pipe.

The put method will then try to rendezvous with a receiver job, if any.
If there is no receiver waiting for data, the sender will pause until another
job calls `yield pipe.get()`, which will then trigger a rendezvous.

#### Example
```
job(function* () {
    yield pipe.put(42);
});
```

### Params: 

* **AnyType** *data* The data to put into the pipe.

## Pipe.get()

Call `yield pipe.get()` from a job (the receiver) to get data from the pipe.

The get method will then try to rendezvous with a sender job, if any.
If there is no sender waiting for the data it sent to be delivered, the receiver will
pause until another job calls `yield pipe.put(data)`, which will then trigger
a rendezvous.

#### Example:
```
job(function* () {
    var data;
    while (data = yield pipe.get()) {
        console.log(data);
    }
});
```

### Return:

* **AnyType** The data that was received from the pipe.

## Pipe.send(data)

Like `put`, but non-blocking. Unlike `put`, do not call with `yield`.

#### Example:
```
pipe.send(42);
```

### Params: 

* **AnyType** *data* The data to put in the pipe.

<!-- End src/jspipe.js -->

