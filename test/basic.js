const Clusterstream = require('../index');
const Streamz = require('streamz');
const path = require('path');
const Promise = require('bluebird');
const t = require('tap');

const values = [...Array(100)].map( (d,i) => i);
const feeder = () => {
  const s = Streamz();
  values.forEach(d => s.write(d));
  s.end();
  return s;
};

t.test('basic clusterstream', {autoend:true, jobs:10},  t => {
  let results = [],stats = [];
  t.test('initialized with a function', async t => {
    await feeder().pipe(Clusterstream(d => {
      let count = 0;
      const Promise = require('bluebird');
      const Streamz = require('streamz');
      return d.pipe(Streamz(5,async e => {
        count++;
        await Promise.delay(10);
        return {number:e};
      },{
        flush: function(cb) {
          this.push({workerId: d.workerId,count});
          cb();
        }
      }));
    }))
    .pipe(Streamz(d => {
      if (d.number !== undefined)
        results.push(d.number);
      else
        stats.push(d);
    }))
    .promise();

    results = results.sort( (a,b) => a-b);
    t.same(results,values,'values are correct');
    t.ok(stats.length,'workers flush');
    const expectedCount = values.length / stats.length;
    stats.forEach(d => {
      t.ok(d.count >= Math.floor(expectedCount) && d.count <= Math.ceil(expectedCount),`tasks are evenly distributed - worker ${d.workerId} completed ${d.count}`);
    });
    t.end();
  });

  t.test('initialized with a module path', async t => {
    let results = [],stats = [];
    await feeder().pipe(Clusterstream(path.resolve(__dirname,'./fn.js')))
    .pipe(Streamz(d => {
      if (d.number !== undefined)
        results.push(d.number);
      else
        stats.push(d);
    }))
    .promise();

    results = results.sort( (a,b) => a-b);
    t.same(results,values,'values are correct');
    t.ok(stats.length,'workers flush');
    const expectedCount = values.length / stats.length;
    stats.forEach(d => {
      t.ok(d.count >= Math.floor(expectedCount) && d.count <= Math.ceil(expectedCount),`tasks are evenly distributed - worker ${d.workerId} completed ${d.count}`);
    });
    t.end();
  });

  t.test('clusterstream.map initialized with a module path', async t => {
    let results = [];
    await feeder().pipe(Clusterstream.map(path.resolve(__dirname,'./map-fn.js')))
    .pipe(Streamz(d => {
      results.push(d.number);
    }))
    .promise();

    results = results.sort( (a,b) => a-b);
    t.same(results,values,'values are correct');
    t.end();
  });

  t.test('missing fn or module', async t => {
    const e = await Promise.try(() => feeder().pipe(Clusterstream()))
      .then( () => { throw 'Should Error';}, Object);
    t.same(e.message,'Invalid FN - needs to be a function or a module path');
  });

});
