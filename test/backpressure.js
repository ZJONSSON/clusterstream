// This test can be a little flaky as we don't have control of test machine specs
// the size of the stdin/stdout buffers etc

const Clusterstream = require('../index');
const Streamz = require('streamz');
const Stream = require('stream');
const Promise = require('bluebird');
const t = require('tap');
const crypto = require('crypto');

const payload = crypto.randomBytes(500).toString('hex');

const feeder = () => Stream.Readable({
  read : async function() {
    this.i = (this.i || 0) + 1;
    await Promise.delay(this.i === 1 ? 500 : 1);
    if (this.i > 2000)
      this.push(null);
    else
      this.push({num: this.i, payload});
  },
  objectMode:true
});

t.test('backpressure', {autoend:true},  t => {
  t.test('no delay anywhere', async t => {
    const c = Clusterstream({children: 2}, d => {
      const Streamz = require('streamz');
      let count = 0;
      return d.pipe(Streamz(async d => {
        count += 1;
        return d;
      },{
        highWaterMark: 0,
        flush: function(cb) {
          this.push({workerId: d.workerId,count});
          cb();
        }
      }));
    });

    await Promise.delay(500);  // allow workers time to initilize

    let paused = 0, resumed = 0;
    const res = await feeder()
      .pipe(c)
      .on('paused',() => paused++)
      .on('resumed',() => resumed++)
      .promise();

    t.ok(paused <= 1, `paused at most one time ${paused} times`);
    t.ok(paused == resumed,'resumed as often as paused');
    t.same(res.filter(d => d.workerId !== undefined).length,2,'All workers flushed');
    t.end();
  });


  t.test('delay inside the worker', async t => {
    const c = Clusterstream({children: 2}, d => {
      const Promise = require('bluebird');
      const Streamz = require('streamz');
      let count = 0;
      return d.pipe(Streamz(async d => {
        if (count == 10 || count == 500)
          await Promise.delay(1000);
        count += 1;
        return d;
      },{
        highWaterMark: 0,
        flush: function(cb) {
          this.push({workerId: d.workerId,count});
          cb();
        }
      }));
    });

    await Promise.delay(500);  // allow workers time to initilize

    let paused = 0, resumed = 0;
    const res = await feeder()
      .pipe(c)
      .on('paused',() => paused++)
      .on('resumed',() => resumed++)
      .promise();

    t.ok(paused > 1, `paused more than once (${paused})`);
    t.ok(paused == resumed,'resumed as often as paused');
    t.same(res.filter(d => d.workerId !== undefined).length,2,'All workers flushed');
    t.end();
  });

  t.test('delay inside the receiver', async t => {
    const c = Clusterstream({children: 2, highWaterMark: 0}, d => {
      const Streamz = require('streamz');
      let count = 0;
      return d.pipe(Streamz(d => {
        count += 1;
        return d;
      },{
        highWaterMark: 0,
        flush: function(cb) {
          this.push({workerId: d.workerId,count});
          cb();
        }
      }));
    });

    await Promise.delay(500);  // allow workers time to initilize

    let paused = 0, resumed = 0;
    const res = await feeder()
      .pipe(c)
      .on('paused',() => paused++)
      .on('resumed',() => resumed++)
      .pipe(Streamz(async d => {
        if (d.num === 5 || d.num === 200)
          await Promise.delay(2000);
        return d;
      },{highWaterMark: 0}))
      .promise();

    t.ok(paused > 1, `paused more than once (${paused})`);
    t.ok(paused == resumed,'resumed as often as paused');
    t.same(res.filter(d => d.workerId !== undefined).length,2,'All workers flushed');
    t.end();
  });  
});