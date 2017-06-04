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
