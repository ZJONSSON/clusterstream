const Streamz = require('streamz');
const split = require('binary-split');
const DELIMITER = '\n\t\t\t\n\t\n\n\t\t\t\n\t\n';
const highWaterMark = 1;

// We need to explicitly put require on global to make it accessable
// within `new Function(..)`
global.require = require;
global.console.log = console.error;
const out = Streamz(null,{
  highWaterMark,
  flush: function(cb) {
    this.push({
      _ClusterStreamMessage: true,
      end: true
    });
    cb();
  }
});

let fn;

function initialize(d) {
  // Copy any passed arguments into the worker global
  global.argv = d.argv;
  worker.workerId = d.workerId;
  for (let key in d.global)
    global[key] = d.global[key];

  [].concat(d.require || []).forEach(key => global[key] = require(key));

  // Try parsing supplied function or load a module and set up pipe
  try {
    if (d.fn)
      fn = (new Function(`return ${d.fn}`))();
    else if (d.module)
      fn = require(d.module);
    else {
      fn = true;
      throw new Error('No `fn` or `module` defined');
    }
    fn(worker).pipe(out);
  } catch(e) {
    out.emit('error',e);
  }
}

const worker = process.stdin
  .pipe(split(DELIMITER),{highWaterMark})
  .pipe(Streamz(d => {
    d = JSON.parse(d);
    return !fn ? initialize(d) : d;
  },{highWaterMark}))
  .on('error',e => out.emit('error',e));

out
  .on('error',e => {
    e = {
      _ClusterStreamMessage: true,
      message: e.message || e,
      stack: e.stack,
      error: true
    };
    process.stdout.write(JSON.stringify(e)+DELIMITER);
  })
  .pipe(Streamz(d => JSON.stringify(d)+DELIMITER),{highWaterMark})
  .pipe(process.stdout);
