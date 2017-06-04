const Stream = require('stream');
const Clusterstream = require('../index');

const feeder = Stream.PassThrough({objectMode:true});
[...Array(100)].forEach( (d,i) => feeder.write({data:i}));
feeder.end();

feeder.pipe(Clusterstream(incoming => {
  const Stream = require('stream');
  return incoming.pipe(Stream.Transform({
    objectMode: true,
    transform: (d,e,cb) => setTimeout(() => cb(null,{data:d.data,worker:incoming.workerId}),500)
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