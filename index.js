const os = require('os');
const child_process = require('child_process');
const duplexer2 = require('duplexer2');
const Streamz = require('streamz');
const split = require('binary-split');
const path = require('path');
const DELIMITER = '\n\t\t\t\n\t\n\n\t\t\t\n\t\n';

function Clusterstream(options, fn, isMap) {
  const workers = new Set();
  const available = new Set();

  let next;

  if (typeof options === 'function' || typeof options === 'string') {
    fn = options;
    options = {};
  } else if (!isNaN(options)) {
    options = { children: options};
  }

  if (!fn)
    throw new Error('Invalid FN - needs to be a function or a module path');

  options = options || {};
  const highWaterMark = options.highWaterMark;

  const outStream = Streamz(null,{keepAlive: true, highWaterMark});
  const children = (options.children || os.cpus().length);
  const parentDir = path.resolve(process.cwd());

  for (let w = 0; w < children; w++) {
    const worker = child_process.fork(path.resolve(__dirname,'./worker.js'),{stdio:['pipe','pipe','pipe','ipc'],cwd: parentDir});

    // Send everything as stringified JSON + splitkey
    worker.transmit = d => worker.stdin.write(JSON.stringify(d)+DELIMITER);

    worker.stderr.pipe(Streamz(d => console.error(d.toString())));

    worker.stdin.on('drain', () => {
      available.add(worker);
      if (next) {
        Clusterstream.emit('resumed');
        worker.transmit({action:'data',payload:next.payload});
        setImmediate(next.cb);
        next = undefined;
      }
    });

    worker.stdout
      .pipe(split(DELIMITER))
      .pipe(Streamz(function(d) {
        d = JSON.parse(d);
        if (d._ClusterStreamMessage) {
          if (d._ClusterStreamMessage === 'error')
            this.emit('error',d);
          else if (d._ClusterStreamMessage === 'end') {
            worker.disconnect();
            this.end();
          }
          else if (d._ClusterStreamMessage === 'event') {
            Clusterstream.emit('event',d.data);
          }
        } else
          return d;
      },{highWaterMark}))
      .on('end', () => {
        available.delete(worker);
        workers.delete(worker);

        if (!workers.size)
          outStream.end();
      })
      .pipe(outStream);

    worker.transmit({
      isMap: isMap,
      argv: options.argv,
      concurrency: options.concurrency,
      global: options.global,
      require: options.require,
      fn: typeof fn === 'function' ? fn.toString() : undefined,
      module: typeof fn === 'string' ? path.resolve(fn) : undefined,
      workerId: w
    });

    workers.add(worker);
    available.add(worker);
  }

  const inStream = Streamz((payload,cb) => {
    // If all workers are busy we put a placeholder for next available worker
    if (!available.size) {
      Clusterstream.emit('paused');
      next = {payload, cb};
    }
    // Otherwise we send packet to the oldest available worker
    // ([...available] returns fifo array from left to right)
    else {
      const pick = [...available][0];
      available.delete(pick);
      available.add(pick);
      if (!pick.transmit(payload))
        available.delete(pick);
      setImmediate(cb);
    }
  },Object.assign({
    // On flush we close all workers
    flush: cb => {
      [...workers].forEach(worker => worker.stdin.end());
      cb();
    }
  },options));

  const Clusterstream = duplexer2(Object.assign(options,{objectMode: true}),inStream,outStream);
  Clusterstream.workers = workers;
  Clusterstream.available = available;
  Clusterstream.promise = Streamz.prototype.promise;
  return Clusterstream;
}

Clusterstream.map = (options,fn) => Clusterstream(options,fn,true);

module.exports = Clusterstream;
