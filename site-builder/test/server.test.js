import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPEC, toolTurn, textTurn, fakeClaude, fakePaddle, setup, req, res } from './helpers.js';
import { createChat } from '../api/chat.js';
import { createMe } from '../api/me.js';
import { createPhotos } from '../api/photos.js';
import { createPublish } from '../api/publish.js';
import { createVerify } from '../api/verify-subscription.js';
import { createSubscription } from '../api/subscription.js';
import { createAccount } from '../api/account.js';
import { createSite } from '../api/site.js';
import { LIMITS } from '../lib/server.js';
import { normalizeSpec } from '../lib/site-spec.js';
import { renderSite, waNumber } from '../render.js';

const call = async (factory, deps, opts) => { const r = res(); await factory(deps)(req(opts), r); return r; };
const subscribe = async (deps, user = 'user-a') => {
  const site = (await deps.store.siteByOwner(user)) || (await deps.store.createSite(user));
  await deps.store.updateSite(site, { subscription_id: 'sub_abcdefghij01', subscription_status: 'active', subscription_checked_at: new Date(deps.now()).toISOString() });
};

test('requires sign-in', async () => {
  const deps = setup();
  for (const f of [createChat, createMe, createPhotos, createPublish, createVerify, createSubscription, createAccount]) {
    const r = await call(f, deps, { token: 'nope', method: f === createMe ? 'GET' : f === createAccount ? 'DELETE' : 'POST', body: {} });
    assert.equal(r.code, 401, f.name);
  }
});

test('first conversation builds the site, stores history server-side, counts free turns', async () => {
  const deps = setup({ claude: fakeClaude([toolTurn(), textTurn('בניתי גרסה ראשונה.')]) });
  const r = await call(createChat, deps, { body: { text: 'יש לי סטודיו לקוסמטיקה בחיפה' } });
  assert.equal(r.code, 200);
  assert.equal(r.body.reply, 'בניתי גרסה ראשונה.');
  assert.equal(r.body.site.spec.business_name, 'סיוון כהן');
  assert.equal(r.body.site.freeLeft, LIMITS.free - 1);
  assert.equal(r.body.site.published, false);
  assert.ok(!('history' in r.body.site), 'raw conversation never goes to the browser');

  const row = await deps.store.siteByOwner('user-a');
  assert.deepEqual(row.history.map((m) => m.role), ['user', 'system', 'assistant', 'user', 'assistant']);
  assert.deepEqual(row.history[2].content[0], toolTurn().content[0], 'thinking block stored unchanged');
  assert.deepEqual(row.chat, [{ who: 'me', text: 'יש לי סטודיו לקוסמטיקה בחיפה' }, { who: 'bot', text: 'בניתי גרסה ראשונה.' }]);

  // second turn sends the stored history back, append-only, in edit mode
  await call(createChat, deps, { body: { text: 'תשני לירוק' } });
  const last = deps.claude.calls.at(-1);
  assert.deepEqual(last.messages.slice(0, 5), row.history);
  assert.match(last.messages[6].content, /mode=edit/);
  assert.equal(last.model, 'claude-opus-5-5');
  assert.equal(last.fallbacks, 'default');
});

test('free limit, then subscription lifts it; paid monthly cap', async () => {
  const deps = setup();
  const site = await deps.store.createSite('user-a');
  await deps.store.updateSite(site, { free_turns: LIMITS.free });
  let r = await call(createChat, deps, { body: { text: 'עוד שינוי' } });
  assert.equal(r.code, 402);
  assert.equal(r.body.error, 'free_limit');
  assert.equal(deps.claude.calls.length, 0, 'no Claude call when over the limit');

  await subscribe(deps);
  r = await call(createChat, deps, { body: { text: 'עוד שינוי' } });
  assert.equal(r.code, 200);
  assert.equal(r.body.site.monthLeft, LIMITS.paidPerMonth - 1);

  const row = await deps.store.siteByOwner('user-a');
  await deps.store.updateSite(row, { month_turns: LIMITS.paidPerMonth });
  r = await call(createChat, deps, { body: { text: 'עוד' } });
  assert.equal(r.code, 429);
});

test('owners are isolated from each other', async () => {
  const deps = setup({ claude: fakeClaude([toolTurn(), textTurn('ok')]) });
  await call(createChat, deps, { body: { text: 'שלום' } });
  const b = await call(createMe, deps, { method: 'GET', token: 'tokB' });
  assert.equal(b.body.site, null);
  const a = await call(createMe, deps, { method: 'GET' });
  assert.equal(a.body.site.spec.business_name, 'סיוון כהן');
});

test('publishing: needs a site and a subscription, validates and reserves slugs', async () => {
  const deps = setup({ claude: fakeClaude([toolTurn(), textTurn('ok'), toolTurn({ ...SPEC, business_name: 'אחר' }), textTurn('ok')]) });
  let r = await call(createPublish, deps, { body: { action: 'publish', slug: 'sivan' } });
  assert.equal(r.body.error, 'no_site_yet');

  await call(createChat, deps, { body: { text: 'שלום' } });
  r = await call(createPublish, deps, { body: { action: 'publish', slug: 'sivan' } });
  assert.equal(r.code, 402);

  await subscribe(deps);
  for (const bad of ['a', 'Has Space', '-x-', 'api', 'a--b', 'שלום']) {
    r = await call(createPublish, deps, { body: { action: 'publish', slug: bad } });
    assert.equal(r.body.error, 'bad_slug', bad);
  }
  r = await call(createPublish, deps, { body: { action: 'publish', slug: 'sivan-beauty' } });
  assert.equal(r.code, 200);
  assert.equal(r.body.site.liveUrl, 'https://builder.test/s/sivan-beauty');

  // another owner cannot take the same address
  await call(createChat, deps, { token: 'tokB', body: { text: 'שלום' } });
  await subscribe(deps, 'user-b');
  r = await call(createPublish, deps, { token: 'tokB', body: { action: 'publish', slug: 'sivan-beauty' } });
  assert.equal(r.body.error, 'slug_taken');
});

test('published site is served only while published and subscribed, escaped, with credit', async () => {
  const deps = setup({ claude: fakeClaude([toolTurn({ ...SPEC, tagline: '<img src=x onerror=alert(1)>' }), textTurn('ok')]) });
  await call(createChat, deps, { body: { text: 'שלום' } });
  await subscribe(deps);
  await call(createPublish, deps, { body: { action: 'publish', slug: 'sivan' } });

  let r = await call(createSite, deps, { method: 'GET', token: null, query: { slug: 'sivan' } });
  assert.equal(r.code, 200);
  assert.match(r.headers['content-type'], /text\/html/);
  assert.ok(r.ended.includes('סיוון'));
  assert.ok(!r.ended.includes('<img src=x'), 'content is escaped');
  assert.ok(r.ended.includes('נבנה עם'));
  assert.ok(r.ended.includes('rel="canonical" href="https://builder.test/s/sivan"'));

  // subscription lapses: once the daily re-check runs, the site goes dark
  deps.paddle.status = 'canceled';
  const row = await deps.store.siteBySlug('sivan');
  await deps.store.updateSite(row, { subscription_checked_at: new Date(0).toISOString() });
  r = await call(createSite, deps, { method: 'GET', token: null, query: { slug: 'sivan' } });
  assert.equal(r.code, 404);

  r = await call(createSite, deps, { method: 'GET', token: null, query: { slug: '../etc' } });
  assert.equal(r.code, 404);
});

test('Paddle outage keeps the last known status instead of taking sites down', async () => {
  const deps = setup();
  deps.paddle.subscriptionStatus = async () => { throw new Error('paddle_http_500'); };
  await subscribe(deps);
  const row = await deps.store.siteByOwner('user-a');
  await deps.store.updateSite(row, { subscription_checked_at: new Date(0).toISOString() });
  const r = await call(createMe, deps, { method: 'GET' });
  assert.equal(r.body.site.subscribed, true);
});

test('verify-subscription links a paid checkout to the same user only', async () => {
  const paddle = fakePaddle({ txn: (id, userId) => (userId === 'user-a' ? { subscriptionId: 'sub_abcdefghij01' } : { error: 'not_yours' }) });
  const deps = setup({ paddle });
  let r = await call(createVerify, deps, { token: 'tokB', body: { transactionId: 'txn_abcdefghij01' } });
  assert.equal(r.code, 400);
  r = await call(createVerify, deps, { body: { transactionId: 'txn_abcdefghij01' } });
  assert.equal(r.code, 200);
  assert.equal(r.body.site.subscribed, true);
});

test('photos: type and count checked, owner-only delete', async () => {
  const deps = setup();
  const jpeg = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString('base64');
  const fake = 'data:image/jpeg;base64,' + Buffer.from('<html>not an image</html>').toString('base64');
  assert.equal((await call(createPhotos, deps, { body: { data: fake } })).body.error, 'bad_image');
  let r = await call(createPhotos, deps, { body: { data: jpeg } });
  assert.equal(r.code, 200);
  assert.equal(r.body.site.photos.length, 1);
  const { path } = r.body.site.photos[0];
  assert.ok(path.startsWith('user-a/'));

  assert.equal((await call(createPhotos, deps, { token: 'tokB', method: 'DELETE', body: { path } })).code, 404);
  for (let i = 1; i < LIMITS.photos; i++) await call(createPhotos, deps, { body: { data: jpeg } });
  assert.equal((await call(createPhotos, deps, { body: { data: jpeg } })).body.error, 'too_many');

  r = await call(createPhotos, deps, { method: 'DELETE', body: { path } });
  assert.equal(r.body.site.photos.length, LIMITS.photos - 1);
  assert.ok(!deps.store.files.has(path));
});

test('cancel keeps the site until period end; account deletion cancels immediately and erases data', async () => {
  const deps = setup({ claude: fakeClaude([toolTurn(), textTurn('ok')]) });
  await call(createChat, deps, { body: { text: 'שלום' } });
  await subscribe(deps);

  let r = await call(createSubscription, deps, { body: { action: 'cancel' } });
  assert.equal(r.code, 200);
  assert.deepEqual(deps.paddle.canceled[0], ['sub_abcdefghij01', 'next_billing_period']);

  assert.equal((await call(createAccount, deps, { method: 'DELETE', body: {} })).body.error, 'confirm_required');
  r = await call(createAccount, deps, { method: 'DELETE', body: { confirm: 'DELETE' } });
  assert.equal(r.code, 200);
  assert.deepEqual(deps.paddle.canceled[1], ['sub_abcdefghij01', 'immediately']);
  assert.equal(await deps.store.siteByOwner('user-a'), null);
  assert.equal((await call(createMe, deps, { method: 'GET' })).code, 401, 'login removed');
});

test('concurrent writes: a stale update is rejected, not merged', async () => {
  const deps = setup();
  const site = await deps.store.createSite('user-a');
  assert.ok(await deps.store.updateSite(site, { chat: [{ who: 'me', text: '1' }] }));
  assert.equal(await deps.store.updateSite(site, { chat: [{ who: 'me', text: '2' }] }), null);
});

test('normalizeSpec and renderSite basics', () => {
  const { spec } = normalizeSpec({ ...SPEC, theme: 'neon', since_year: 'ישן' });
  assert.equal(spec.theme, 'copper');
  assert.equal(spec.since_year, '');
  assert.equal(spec.instagram, 'sivan.beauty');
  const html = renderSite({ ...spec, business_name: '<script>x</script>' });
  assert.ok(!html.includes('<script>x</script>'));
  assert.ok(html.includes('https://wa.me/972521234567'));
  assert.equal(waNumber('+972 52-123-4567'), '972521234567');
});
