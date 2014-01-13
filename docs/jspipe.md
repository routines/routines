

<!-- Start src/jspipe.js -->

## job(fn, args)

Run a generator function `fn` as a concurrent job.

### Example:

```
var pipe = new JSPipe.Pipe();

JSPipe.job(function* () {
  pipe.send(&#39;job 1&#39;);
});

JSPipe.job(function* () {
    while (true) {
        yield JSPipe.timeout(250).get();
        pipe.send(&#39;job 2&#39;);
    }
});

JSPipe.job(function* () {
    while (true) {
        yield JSPipe.timeout(400).get();
        pipe.send(&#39;job 3&#39;);
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

* **Function*** *fn* A generator function to execute as a concurrent job

* **Array** *args* Parameters to pass to `fn`

## Pipe()

A pipe provides a way for two jobs to communicate data + synchronize their execution.

One job can send data by calling &quot;yield pipe.put(data)&quot; and another job can
receive data by calling &quot;yield pipe.get()&quot;.

## put()

Call &quot;yield pipe.put(data)&quot; from a job (the sender) to put data in the pipe.

The put method will then try to rendezvous with a receiver job, if any.
If there is no receiver waiting for data, the sender will pause until another
job calls &quot;yield pipe.get()&quot;, which will then trigger a rendezvous.

## get()

Call &quot;yield pipe.get()&quot; from a job (the receiver) to get data from the pipe.

The get method will then try to rendezvous with a sender job, if any.
If there is no sender waiting for the data it sent to be delivered, the receiver will
pause until another job calls &quot;yield pipe.put(data)&quot;, which will then trigger
a rendezvous.

## _rendezvous()

A pipe is a rendezvous point for two otherwise independently executing jobs.
Such communication + synchronization on a pipe requires a sender and receiver.

A job sends data to a pipe using &quot;yield pipe.put(data)&quot;.
Another job receives data from a pipe using &quot;yield pipe.get()&quot;.

Once both a sender job and a receiver job are waiting on the pipe,
the _rendezvous method transfers the data in the pipe to the receiver and consequently
synchronizes the two waiting jobs.

Once synchronized, the two jobs continue execution.

<!-- End src/jspipe.js -->

