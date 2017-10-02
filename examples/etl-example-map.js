const etl = require('etl');
const Clusterstream = require('../index');

etl.toStream([...Array(100)].map( (d,i) => ({data:i})))
.pipe(Clusterstream.map('./etl-transform.js'))
.pipe(etl.map(d => console.log('received',d)));
