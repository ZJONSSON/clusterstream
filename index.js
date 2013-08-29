var cluster = require("cluster"),
    stream = require("stream"),
    util = require("util");

function Fork(n,options) {
  if (!(this instanceof Fork))
    return new Fork(n,options);

  var self = this;
  stream.PassThrough.call(this,options);
  this.workers = [];
  this.available = [];

  this.on("end",function() {
    this.workers.forEach(function(worker) {
      worker.send(null);
      worker.disconnect();
    });
  });

  while (n--) this.newWorker(n);
}

util.inherits(Fork,stream.PassThrough);

Fork.prototype.next = function() {
  var chunk;
  if (this.available.length && (chunk = this.read()))
    this.available.shift().send(chunk);
};

Fork.prototype.newWorker = function() {
  var self = this;
   cluster.fork()
      .on('online',function() {
        self.workers.push(this);
        self.available.push(this);
        self.next();
      })
      .on('message',function(d) {
        self.available.push(this);
        self.next();
      });
};

function Worker(options) {
   if (!(this instanceof Worker))
    return new Worker(options);

  var self = this;
  stream.Readable.call(this,options);
  process.on('message',function(msg) {
    self.push(msg);
  });
}

util.inherits(Worker,stream.Readable);

Worker.prototype._read = function() {
  process.send('done');
};

module.exports = {
  Fork : Fork,
  Worker : Worker,
  isMaster : cluster.isMaster,
  isWorker : cluster.isWorker
};
