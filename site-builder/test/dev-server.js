// Local server for end-to-end tests: serves the static files like Vercel
// (clean URLs, /s/:slug rewrite) and runs the real API handlers against an
// in-memory store, a scripted fake Claude and a fake Paddle.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { memoryStore } from '../lib/store.js';
import { createChat } from '../api/chat.js';
import { createMe } from '../api/me.js';
import { createPhotos } from '../api/photos.js';
import { createPublish } from '../api/publish.js';
import { createVerify } from '../api/verify-subscription.js';
import { createSubscription } from '../api/subscription.js';
import { createAccount } from '../api/account.js';
import { createSite } from '../api/site.js';
import { SPEC } from './helpers.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

// Scripted Claude: asks one question, builds on the second message, applies "green"/"ירוק" edits.
function scriptedClaude() {
  return { beta: { messages: { create: async ({ messages }) => {
    const last = messages.at(-1);
    if (last.role === 'user' && Array.isArray(last.content) && last.content[0]?.type === 'tool_result') {
      return { stop_reason: 'end_turn', usage: {}, content: [{ type: 'text', text: 'עדכנתי את האתר, הוא מופיע ליד הצ׳אט.' }] };
    }
    const owner = messages.filter((m) => m.role === 'user' && typeof m.content === 'string');
    const text = owner.at(-1)?.content || '';
    const built = messages.some((m) => m.role === 'assistant' && m.content.some((b) => b.type === 'tool_use'));
    if (!built && owner.length < 2) return { stop_reason: 'end_turn', usage: {}, content: [{ type: 'text', text: 'נשמע מקסים! מה השירותים העיקריים?' }] };
    const spec = { ...SPEC, theme: /ירוק|green/.test(text) ? 'emerald' : SPEC.theme };
    return { stop_reason: 'tool_use', usage: {}, content: [{ type: 'tool_use', id: `tu_${Date.now()}`, name: 'update_site', input: spec }] };
  } } } };
}

function fakePaddle() {
  const p = { configured: true, status: 'active', canceled: [],
    async subscriptionStatus() { return p.status; },
    async subscriptionForTransaction(id, userId) { return id === 'txn_testtesttest01' ? { subscriptionId: `sub_${userId.replace(/\W/g, '')}000001` } : { error: 'not_found' }; },
    async cancelSubscription(id, when) { p.canceled.push([id, when]); return true; } };
  return p;
}

export function start(port = 8790) {
  const deps = {
    store: memoryStore({ users: { tokA: { id: 'user-a', email: 'owner@example.com' } }, publicBase: `http://127.0.0.1:${port}/__files/` }),
    claude: scriptedClaude(), paddle: fakePaddle(), now: Date.now,
  };
  const routes = {
    '/api/chat': createChat(deps), '/api/me': createMe(deps), '/api/photos': createPhotos(deps),
    '/api/publish': createPublish(deps), '/api/verify-subscription': createVerify(deps),
    '/api/subscription': createSubscription(deps), '/api/account': createAccount(deps), '/api/site': createSite(deps),
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = url.pathname;
    const query = Object.fromEntries(url.searchParams);
    const slug = /^\/s\/([^/]+)$/.exec(pathname);
    if (slug) { pathname = '/api/site'; query.slug = slug[1]; }

    if (pathname.startsWith('/__files/')) {
      const bytes = deps.store.files.get(decodeURIComponent(pathname.slice(9)));
      if (!bytes) { res.statusCode = 404; return res.end(); }
      res.setHeader('Content-Type', 'image/jpeg');
      return res.end(bytes);
    }
    if (routes[pathname]) {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      req.body = raw ? JSON.parse(raw) : undefined;
      req.query = query;
      res.status = (c) => { res.statusCode = c; return res; };
      res.json = (b) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(b)); return res; };
      try { await routes[pathname](req, res); } catch (e) { console.error(e); res.statusCode = 500; res.end('error'); }
      return;
    }
    let file = pathname === '/' ? '/index.html' : pathname;
    if (!path.extname(file)) file += '.html';
    const full = path.join(root, file);
    if (!full.startsWith(root)) { res.statusCode = 403; return res.end(); }
    try {
      const body = await fs.readFile(full);
      res.setHeader('Content-Type', TYPES[path.extname(full)] || 'application/octet-stream');
      res.end(body);
    } catch { res.statusCode = 404; res.end('not found'); }
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok({ server, deps })));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) start(Number(process.argv[2]) || 8790).then(() => console.log('dev server up'));
