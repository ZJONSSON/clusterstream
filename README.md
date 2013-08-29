Clusterstream allows streams to extend across a cluster of child processes.   In the master, simply pipe the end of the origin stream into `clusterstream.Fork(n,options)`, where `n` stands for the number of forks created.  In the worker simple pipe from `clusterstream.Worker(options)` to receive the data on the other end.   Don't forget to set `objecMode:true` in the options if you are passing object (most likely case).

Here is a quick and dirty usage example:

```js
var clusterstream = require("clusterstream"),
  stream = require("stream");

if (clusterstream.isMaster) {
  // Set up a simple passthrough to accept our testdata and pipe it to a Fork
  var p = stream.PassThrough({objectMode:true})
    .pipe(clusterstream.Fork(2,{objectMode:true}));

  // Send data down the wire, ending with a null
  [1,2,3,4,5,6,7,8,9,10,11,12,null].forEach(function(d) {
    p.push(d);
  });
}

if (clusterstream.isWorker)  {
  // set up a simple delayed console.log for demonstration purposes
  var logStream = stream.Transform({objectMode:true,highWaterMark:1});

  logStream._transform = function(chunk,encoding,callback) {
    setTimeout(function(d) {
      console.log(chunk);
      callback();
    },700);
  };

  //Pipe the worker into the console.log stream
  clusterstream.Worker({objectMode:true})
    .pipe(logStream)
    .on("finish",function() {
      console.log("the end of this worker");
    });
}


```