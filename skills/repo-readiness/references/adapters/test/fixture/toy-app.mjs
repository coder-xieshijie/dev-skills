// A tiny notes service for the HTTP adapter's tests. It takes its port, data directory and run ID
// from the environment (PORT, DATA_DIR, RUN_ID) or from arguments (--port, --data, --token).
// BUG=1 makes POST /notes answer 201 without storing the note: the counterexample a scenario must
// catch. With --token, every request without `authorization: Bearer <token>` answers 401.
// GET /env/<NAME> answers what the instance sees of one environment variable; health answers the
// run ID and the pid.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const arg = (name) => {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1] : undefined;
};
const PORT = arg('port') ?? process.env.PORT;
const DATA_DIR = arg('data') ?? process.env.DATA_DIR;
const TOKEN = arg('token');
const { RUN_ID, BUG } = process.env;
mkdirSync(DATA_DIR, { recursive: true });
const file = path.join(DATA_DIR, 'notes.json');
const load = () => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : []);

const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

http
  .createServer((req, res) => {
    if (TOKEN && req.headers.authorization !== `Bearer ${TOKEN}`) return send(res, 401, { error: 'token_required' });
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { runId: RUN_ID, pid: process.pid });
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
