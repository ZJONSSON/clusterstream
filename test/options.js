const Clusterstream = require('../index');
const Streamz = require('streamz');
const t = require('tap');

// Turn off event emitter warnings
require('events').EventEmitter.prototype._maxListeners = Infinity;

const values = [...Array(100)].map( (d,i) => i);
const feeder = () => {
  const s = Streamz();
  values.forEach(d => s.write(d));
  s.end();
  return s;
};

t.test('options', {autoend:true, jobs:10},  t => {  
  t.test('{children: 1}', async t => {
    const d = await feeder().pipe(Clusterstream({children: 1},d => {
      let count = 0;
      const Streamz = require('streamz');
      return d.pipe(Streamz(5,async () => {count+=1;},{
        flush: function(cb) {
          this.push({workerId: d.workerId,count});
          cb();
        }
      }));
    }))
    .promise();

    t.same(d.length,1,'Only one worker is created');
    t.same(d[0].count,100,'One worker handles the whole stream');
    t.end();
  });

  t.test('{children: 10}', async t => {
    const d = await feeder().pipe(Clusterstream({children: 10},d => {
      let count = 0;
      const Streamz = require('streamz');
      return d.pipe(Streamz(5,async () => {count+=1;},{
        flush: function(cb) {
          this.push({workerId: d.workerId,count});
          cb();
        }
      }));
    }))
    .promise();

    t.same(d.length,10,'10 workers is created');
    t.same(d[0].count,10,'Each worker handles 1/10th of the stream');
    t.end();
  });

  t.test('20', async t => {
    const d = await feeder().pipe(Clusterstream(20,d => {
      let count = 0;
      const Streamz = require('streamz');
      return d.pipe(Streamz(5,async () => {count+=1;},{
        flush: function(cb) {
          this.push({workerId: d.workerId,count});
          cb();
        }
      }));
    }))
    .promise();

    t.same(d.length,20,'20 workers is created');
    t.same(d[0].count,5,'Each worker handles 1/20th of the stream');
    t.end();
  });

  t.test('undefined options', async t => {
    const d = await feeder().pipe(Clusterstream(undefined,d => {
      let count = 0;
      const Streamz = require('streamz');
      return d.pipe(Streamz(5,async () => {count+=1;},{
        flush: function(cb) {
          this.push({workerId: d.workerId,count});
          cb();
        }
      }));
    }))
    .promise();

    t.same(d.length,require('os').cpus().length,'as many workers created as cpus');
    t.end();
  });

});