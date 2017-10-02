Clusterstream is a duplex stream that distributes any incoming data to a pool of workers and pipes down the output of the workers.  Clusterstream uses the stdin/stdout to manage backpressure: when a worker buffer is full the worker is no longer considered available until it emits a `drain` event.  When no workers are available the Clusterstream will pause until any worker becomes available again.

### `Clusterstream([options],fn)`
Each worker is initialized with a supplied function and executes it on the incoming stream.   The first argument of the function will be the incoming stream (sharing all data passed to that worker) and the function itself has to return a stream as well.   The returned stream is then piped back to the parent.  

The function argument can either be a pure javascript function or a full path to a module containing a function.   The function will be executed in the context of the child process, so it will not have access to any variables on the parent scope.  So if you need any required packages you will have to explicitly require them inside the function, even if they are available in parent.  The function will receive a stream as the first argument and will have to return a stream (that is piped back to the parent).  

Options are optional (can be omitted completely):
* children - defines the number of workers to be created
* global - an object of variables that should be put into the global scope for the function
* argv - a standard variable of arguments that will be made available to the function
* require - an array of strings representing modules that should be required (no paths allowed)

By default, Clusterstream creates as many workers as there are cpus.  If options is a number (not an object), then that number will determine the number of workers created.


Here is a quick and dirty example where each worker waits 500ms before returning each object:

```js
const Stream = require('stream');
const Clusterstream = require('../index');

const feeder = Stream.PassThrough({objectMode:true});
[...Array(100)].forEach( (d,i) => feeder.write({data:i}));
feeder.end();

feeder.pipe(Clusterstream(incoming => {
  const Stream = require('stream');
  return incoming.pipe(Stream.Transform({
    objectMode: true,
    transform: (d,e,cb) => setTimeout(() =>
      cb(null,{data:d.data,worker:incoming.workerId}),
      500
    )
  }));
}))
.on('error',console.log)
.pipe(Stream.Transform({
  objectMode: true,
  transform: (d,e,cb) => {
    console.log('received',d);
    cb();
  }
}));
```

Same example using `etl` instead of `Stream.Transform`:

```js
const etl = require('etl');
const Clusterstream = require('../index');

etl.toStream([...Array(100)].map( (d,i) => ({data:i})))
.pipe(Clusterstream(incoming => incoming
  .pipe(require('etl').map(d =>
    require('bluebird').delay(500,{data: d.data,worker:incoming.workerId})
  ))
))
.pipe(etl.map(d => console.log('received',d)));
```



Here is an example of how global variables can be passed into 10 workers:

```js
const etl = require('etl');
const Clusterstream = require('../index');

const multiplier = 2;
const options = {
  children: 10,
  global: {multiplier},
  require: ['etl','bluebird']
};

etl.toStream([...Array(100)].map( (d,i) => ({data:i})))
.pipe(Clusterstream(options, incoming => incoming
  .pipe(etl.map(d =>
    bluebird.delay(500,{data: d.data* multiplier,worker:incoming.workerId})
  ))
))
.pipe(etl.map(d => console.log('received',d)));
```

### `Clusterstream.map([options],fn)`

`Clusterstream.map` is a simple wrapper where you supply a transform function
that receives each packet as an argument and returns the transformed values
(instead of stream input/output)
