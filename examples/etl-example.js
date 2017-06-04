const etl = require('etl');
const Clusterstream = require('../index');

etl.toStream([...Array(100)].map( (d,i) => ({data:i})))
.pipe(Clusterstream(incoming => incoming
  .pipe(require('etl').map(d => require('bluebird').delay(500,{data: d.data,worker:incoming.workerId})))
))
.pipe(etl.map(d => console.log('received',d)));
