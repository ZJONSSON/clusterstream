const child_process = require('child_process');
const Streamz = require('streamz');
const t = require('tap');
const path = require('path');
const DELIMITER = '\n\t\t\t\n\t\n\n\t\t\t\n\t\n';

t.test('worker stdin', {autoend:true, jobs:10},  t => {
  
  t.test('receiving non-object init', async t => {
    const worker = child_process.fork(path.resolve(__dirname,'../worker.js'),{stdio:['pipe','pipe','pipe','ipc']});
    worker.transmit = d => worker.stdin.write(JSON.stringify(d)+DELIMITER);
    worker.stderr.pipe(Streamz(d => console.error(d.toString())));
    
    worker.stdin.end('{fn:d => d"}'+DELIMITER);
    let e = await worker.stdout.pipe(Streamz(e => JSON.parse(e))).promise();
    t.same(e.length,1,'single error received');
    t.same(e[0].message,'Unexpected token f in JSON at position 1','JSON parse error triggered');
    t.end();
  });

  t.test('receiving init without fn or module', async t => {
    const worker = child_process.fork(path.resolve(__dirname,'../worker.js'),{stdio:['pipe','pipe','pipe','ipc']});
    worker.transmit = d => worker.stdin.write(JSON.stringify(d)+DELIMITER);
    worker.stderr.pipe(Streamz(d => console.error(d.toString())));
    
    worker.stdin.end('{}'+DELIMITER);
    let e = await worker.stdout.pipe(Streamz(e => JSON.parse(e))).promise();
    t.same(e.length,1,'single error received');
    t.same(e[0].message,'No `fn` or `module` defined','No fn or module error triggered');
    t.end();
  });
});
