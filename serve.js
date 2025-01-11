#!/usr/bin/env node
// Zero-dependency static server for local use: `npm start` or `node serve.js [port]`.
// Browsers won't run ES modules from file://, so the app needs a tiny server.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};
// Only serve what the app needs.
const ALLOWED = /^\/(?:$|index\.html$|styles\.css$|icon\.svg$|manifest\.webmanifest$|sw\.js$|src\/.+\.(?:js|css)$|docs\/.+)/;

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    if (!ALLOWED.test(path)) { res.writeHead(404).end('Not found'); return; }
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT + sep)) { res.writeHead(403).end('Forbidden'); return; }
    const info = await stat(file);
    if (!info.isFile()) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end('Not found');
  }
});

let port = Number(process.argv[2] ?? process.env.PORT ?? 5173);
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && port < 5200) {
    console.log(`Port ${port} is busy, trying ${port + 1}…`);
    server.listen(++port, '127.0.0.1');
  } else {
    console.error(err.message);
    process.exit(1);
  }
});
server.on('listening', () => console.log(`\n  🍜 Noodle is running at http://localhost:${port}\n  Press Ctrl+C to stop.\n`));
server.listen(port, '127.0.0.1');
