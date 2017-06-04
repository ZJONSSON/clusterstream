// Test function passed as a path to a module
module.exports = d => {
  let count = 0;
  const Promise = require('bluebird');
  const streamz = require('streamz');
  return d.pipe(streamz(5,async e => {
    count++;
    await Promise.delay(10);
    return {number:e};
  },{
    flush: function(cb) {
      this.push({workerId: d.workerId,count});
      cb();
    }
  }));
};