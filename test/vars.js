const Clusterstream = require('../index');
const Streamz = require('streamz');
const t = require('tap');

const feeder = () => {
  const s = Streamz();
  [...Array(100)].forEach(() => s.write(1));
  s.end();
  return s;
};

t.test('Passing variables', {autoend:true, jobs:10},  t => {
  t.test('passing argv', async t => {
    const argv = { test: 42};
    const results = await feeder().pipe(Clusterstream({argv}, d => {
      const Promise = require('bluebird');
      const streamz = require('streamz');
      return d.pipe(streamz(5,async e => {
        await Promise.delay(10);
        return {number:e*argv.test};
      }));
    }))
    .promise();

    t.same(results.reduce( (p,d) => p+d.number,0),100*42);
    t.end();
  });

  t.test('passing global', async t => {
    const test = 42;
    const results = await feeder().pipe(Clusterstream({global: {test}}, d => {
      const Promise = require('bluebird');
      const streamz = require('streamz');
      return d.pipe(streamz(5,async e => {
        await Promise.delay(10);
        return {number:e*test};
      }));
    }))
    .promise();

    t.same(results.reduce( (p,d) => p+d.number,0),100*42);
    t.end();
  });

  t.test('passing require', async t => {
    let streamz,bluebird;
    const results = await feeder().pipe(Clusterstream({require:['bluebird','streamz']}, d => {
      return d.pipe(streamz(5,async e => {
        await bluebird.delay(10);
        return {number:e*42};
      }));
    }))
    .promise();

    t.same(results.reduce( (p,d) => p+d.number,0),100*42);
    t.end();
  });
});