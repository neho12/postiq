import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../api/chat.js';
import { normalizeSpec } from '../lib/site-spec.js';
import { renderSite, waNumber } from '../render.js';

const SPEC = {
  business_name: 'סיוון כהן', business_type: 'קוסמטיקאית', tagline: 'יופי שמרגיש כמו בית', intro: 'טיפולי פנים ולק ג׳ל בסטודיו קטן.',
  cta_label: 'קביעת תור', theme: 'rose', marquee: ['טיפולי פנים', 'לק ג׳ל'],
  services: [{ title: 'טיפול פנים', description: 'ניקוי עמוק', price: '' }],
  about_title: '', about_text: '', faq: [], city: 'חיפה', address: '', hours: '', phone: '052-1234567', instagram: '@sivan.beauty', since_year: '2015',
};

// Fake Anthropic client: returns the queued responses in order and records requests.
function fakeClient(responses) {
  const calls = [];
  return {
    calls,
    beta: { messages: { create: async (params) => { calls.push(structuredClone(params)); return responses.shift(); } } },
  };
}
function fakeRes() {
  return { code: 0, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
}
const toolTurn = { stop_reason: 'tool_use', usage: {}, content: [{ type: 'thinking', thinking: '', signature: 'sig' }, { type: 'tool_use', id: 'tu_1', name: 'update_site', input: SPEC }] };
const endTurn = { stop_reason: 'end_turn', usage: {}, content: [{ type: 'text', text: 'בניתי גרסה ראשונה, היא מופיעה ליד הצ׳אט.' }] };

test('interview turn: runs the tool loop and returns spec + messages to append', async () => {
  const client = fakeClient([toolTurn, endTurn]);
  const handler = createHandler(() => client);
  const res = fakeRes();
  await handler({ method: 'POST', body: { history: [], text: 'יש לי סטודיו לקוסמטיקה בחיפה', photos: 2 } }, res);

  assert.equal(res.code, 200);
  assert.equal(res.body.spec.business_name, 'סיוון כהן');
  assert.equal(res.body.spec.instagram, 'sivan.beauty');
  assert.match(res.body.reply, /גרסה ראשונה/);
  // user, system context, assistant(tool_use), user(tool_result), assistant(text)
  assert.deepEqual(res.body.messages.map((m) => m.role), ['user', 'system', 'assistant', 'user', 'assistant']);
  assert.match(res.body.messages[1].content, /mode=interview; photos uploaded=2/);
  // thinking block passed back unchanged
  assert.deepEqual(res.body.messages[2].content[0], toolTurn.content[0]);

  // server fixes model/tools/system; second call carries the tool result
  const [first, second] = client.calls;
  assert.equal(first.model, 'claude-opus-5-5');
  assert.equal(first.tools[0].name, 'update_site');
  assert.equal(first.tools[0].strict, true);
  assert.deepEqual(first.fallbacks, 'default');
  assert.equal(second.messages.at(-1).content[0].type, 'tool_result');
  assert.equal(second.messages.at(-1).content[0].tool_use_id, 'tu_1');
});

test('edit after the site exists requires an active subscription', async () => {
  const history = [{ role: 'user', content: 'x' }, { role: 'assistant', content: toolTurn.content }];
  const client = fakeClient([endTurn]);
  const deps = { paddleConfigured: () => true, isSubscriptionActive: async (id) => id === 'sub_activeactive01' };

  const denied = fakeRes();
  // hasSite=false on purpose: the history alone must trigger edit mode
  await createHandler(() => client, deps)({ method: 'POST', body: { history, text: 'תשנה את הצבע', hasSite: false } }, denied);
  assert.equal(denied.code, 402);
  assert.equal(denied.body.error, 'subscription_required');
  assert.equal(client.calls.length, 0);

  const ok = fakeRes();
  await createHandler(() => client, deps)({ method: 'POST', body: { history, text: 'תשנה את הצבע', subscriptionId: 'sub_activeactive01' } }, ok);
  assert.equal(ok.code, 200);
  assert.match(ok.body.messages[1].content, /mode=edit/);
});

test('billing not configured fails closed', async () => {
  const res = fakeRes();
  await createHandler(() => fakeClient([]), { paddleConfigured: () => false })(
    { method: 'POST', body: { history: [], text: 'שנה', hasSite: true } }, res);
  assert.equal(res.code, 402);
  assert.equal(res.body.error, 'billing_not_configured');
});

test('rejects images, oversized text and non-POST', async () => {
  const h = createHandler(() => fakeClient([]));
  const img = fakeRes();
  await h({ method: 'POST', body: { history: [{ role: 'user', content: [{ type: 'image', source: {} }] }], text: 'hi' } }, img);
  assert.equal(img.code, 400);
  const big = fakeRes();
  await h({ method: 'POST', body: { history: [], text: 'א'.repeat(5000) } }, big);
  assert.equal(big.code, 400);
  const get = fakeRes();
  await h({ method: 'GET' }, get);
  assert.equal(get.code, 405);
});

test('normalizeSpec bounds and cleans model output', () => {
  const { spec, warnings } = normalizeSpec({ ...SPEC, theme: 'neon', since_year: 'ישן', services: Array(14).fill({ title: 'ש', description: '', price: '' }) });
  assert.equal(spec.theme, 'copper');
  assert.equal(spec.since_year, '');
  assert.equal(spec.services.length, 10);
  assert.ok(warnings.some((w) => w.includes('10 services')));
  assert.deepEqual(normalizeSpec(null).spec.services, []);
});

test('renderSite escapes content and builds WhatsApp links', () => {
  const html = renderSite({ ...normalizeSpec(SPEC).spec, business_name: '<script>alert(1)</script>' });
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('https://wa.me/972521234567'));
  assert.equal(waNumber('+972 52-123-4567'), '972521234567');
});
