const Promise = require('bluebird');
let count = 0;

// Test function passed as a path to a module
module.exports = async e => {
  count += 1;
  await Promise.delay(10);
  return {number:e};
};
