// A tiny notes service for the scripts' own tests. BUG=1 makes POST /notes answer 201 without
// storing the note: the counterexample a scenario must catch. LOGIN_LOST=<marker file> makes the
// first instance log a line that voids its run (the adapter's invalidWhen), and later ones not.
// GET /env/<NAME> answers what the instance sees of one environment variable.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const { PORT, DATA_DIR, RUN_ID, BUG, LOGIN_LOST } = process.env;
mkdirSync(DATA_DIR, { recursive: true });
const file = path.join(DATA_DIR, 'notes.json');
const load = () => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : []);
if (LOGIN_LOST && !existsSync(LOGIN_LOST)) {
  writeFileSync(LOGIN_LOST, '1');
  console.log('LOGIN LOST');
}

const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

http
  .createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { runId: RUN_ID });
    if (req.method === 'GET' && req.url === '/notes') return send(res, 200, { notes: load() });
    if (req.method === 'GET' && req.url.startsWith('/env/'))
      return send(res, 200, { value: process.env[req.url.slice('/env/'.length)] ?? null });
    if (req.method === 'POST' && req.url === '/notes') {
      let raw = '';
      req.on('data', (chunk) => {
        raw += chunk;
      });
      req.on('end', () => {
        const { title } = JSON.parse(raw || '{}');
        if (!title) return send(res, 400, { error: 'title_required' });
        const id = `n${Date.now()}`;
        if (BUG !== '1') writeFileSync(file, JSON.stringify([...load(), { id, title }]));
        return send(res, 201, { id });
      });
      return undefined;
    }
    return send(res, 404, { error: 'not_found' });
  })
  .listen(Number(PORT), '127.0.0.1');
