const Clusterstream = require('../index');
const Streamz = require('streamz');
const Promise = require('bluebird');
const t = require('tap');

const values = [...Array(100)].map( (d,i) => i);
const feeder = () => {
  const s = Streamz();
  values.forEach(d => s.write(d));
  s.end();
  return s;
};

t.test('error handling', {autoend:true},  t => {
  
  t.test('immediate error', async t => {
    const results = [];
    const e = await feeder().pipe(Clusterstream({children: 1},d => {
      return d.pipe(Streamz(async e => {
        return {number:e};
      }));
    }))
    .pipe(Streamz(d => results.push(d)))
    .promise()
    .then(() => { throw 'Should error'; }, Object);

    t.same(results.length,0,'error triggered immediately');
    t.same(e.message,'Streamz is not defined','with reflective error message');
    t.end();
  });

  t.test('error in one worker', async t => {
    const results = [];
    const e = await feeder().pipe(Clusterstream({children: 1},d => {
      const Streamz = require('streamz');
      return d.pipe(Streamz(f => {
        if (f === 9)
          throw 'Error';
        return {number:f};
      }));
    }))
    .pipe(Streamz(d => results.push(d)))
    .promise()
    .then(() => { throw 'Should error'; }, Object);

    t.same(e.message,'Error','Error is thrown');
    t.same(results.length,9,'Results stop');
    t.end();
  });

  t.test('console.log in child (with text)', async t => {
    const e = [];
    console.error = d => e.push(d);

    await feeder().pipe(Clusterstream({children: 1},d => {
      const Streamz = require('streamz');
      return d.pipe(Streamz(f => {
        if (f === 9)
          console.log('We got 9');
      }));
    }))
    .promise();

    t.same(e,['We got 9\n'],'is console.error in parent');
    t.end();
  });

});