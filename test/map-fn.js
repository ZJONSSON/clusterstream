const Promise = require('bluebird');
let count = 0;
let eventDone;

// Test function passed as a path to a module
module.exports = async function(e) {
  if (!eventDone) {
    this.emitEvent('test');
    eventDone = true;
  }
  count += 1;
  await Promise.delay(10);
  return {number:e};
};
