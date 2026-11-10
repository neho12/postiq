import { memoryStore } from '../lib/store.js';

export const SPEC = {
  business_name: 'סיוון כהן', business_type: 'קוסמטיקאית', tagline: 'יופי שמרגיש כמו בית', intro: 'טיפולי פנים ולק ג׳ל בסטודיו קטן.',
  cta_label: 'קביעת תור', theme: 'rose', marquee: ['טיפולי פנים', 'לק ג׳ל'],
  services: [{ title: 'טיפול פנים', description: 'ניקוי עמוק', price: '' }],
  about_title: '', about_text: '', faq: [], city: 'חיפה', address: '', hours: '', phone: '052-1234567', instagram: '@sivan.beauty', since_year: '2015',
};

export const toolTurn = (spec = SPEC) => ({
  stop_reason: 'tool_use', usage: {},
  content: [{ type: 'thinking', thinking: '', signature: 'sig' }, { type: 'tool_use', id: 'tu_1', name: 'update_site', input: spec }],
});
export const textTurn = (text) => ({ stop_reason: 'end_turn', usage: {}, content: [{ type: 'text', text }] });

export function fakeClaude(responses = []) {
  const calls = [];
  return { calls, queue: responses, beta: { messages: { create: async (p) => { calls.push(structuredClone(p)); return responses.shift() ?? textTurn('בסדר.'); } } } };
}

export function fakePaddle({ status = 'active', txn = null } = {}) {
  const p = {
    configured: true, status, txn, canceled: [], checks: 0,
    async subscriptionStatus() { p.checks++; return p.status; },
    async subscriptionForTransaction(id, userId) { return p.txn ? p.txn(id, userId) : { error: 'not_found' }; },
    async cancelSubscription(id, when) { p.canceled.push([id, when]); return true; },
  };
  return p;
}

export function setup({ claude = fakeClaude(), paddle = fakePaddle(), now = () => Date.parse('2026-11-10T12:00:00Z') } = {}) {
  const store = memoryStore({ users: { tokA: { id: 'user-a', email: 'a@example.com' }, tokB: { id: 'user-b', email: 'b@example.com' } } });
  return { store, claude, paddle, now };
}

export function req({ method = 'POST', token = 'tokA', body, query } = {}) {
  return { method, body, query, headers: { authorization: token ? `Bearer ${token}` : '', host: 'builder.test' } };
}

export function res() {
  const r = { code: 200, body: null, headers: {}, ended: null,
    status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; },
    setHeader(k, v) { r.headers[k.toLowerCase()] = v; }, end(s) { r.ended = s; },
    get statusCode() { return r.code; }, set statusCode(c) { r.code = c; } };
  return r;
}
