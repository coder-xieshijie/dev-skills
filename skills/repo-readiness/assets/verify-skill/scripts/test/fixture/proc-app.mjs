// A tiny server for the contract checker's own tests. PORT, RUN_ID and DATA_DIR come from the
// environment. GET /health answers { runId, pid }; GET /value answers { value: 1 }; POST /spawn
// starts a child that keeps running (it inherits this environment, so it names the data directory)
// and records its pid in DATA_DIR/children.

import { spawn } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const { PORT, RUN_ID, DATA_DIR } = process.env;
const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

http
  .createServer((req, res) => {
    if (req.url === '/health') return send(res, 200, { runId: RUN_ID, pid: process.pid });
    if (req.url === '/value') return send(res, 200, { value: 1 });
    if (req.method === 'POST' && req.url === '/spawn') {
      const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore', detached: true });
      child.unref();
      appendFileSync(path.join(DATA_DIR, 'children'), `${child.pid}\n`);
      return send(res, 200, { pid: child.pid });
    }
    return send(res, 404, { error: 'not_found' });
  })
  .listen(Number(PORT), '127.0.0.1');
