// Full customer journey in Chromium against test/dev-server.js.
// Run: npm run e2e [screenshot-dir]   (needs Playwright with Chromium installed)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const { start } = await import('./dev-server.js');

const OUT = process.argv[2] || '/tmp';
const PORT = 8791;
const { server, deps } = await start(PORT);
const BASE = `http://127.0.0.1:${PORT}`;
const errors = [];
const check = (cond, msg) => { if (!cond) errors.push('FAIL: ' + msg); else console.log('ok  ', msg); };

// Fake Supabase auth module (replaces the CDN import), fake Paddle.js, and a filled config.
const FAKE_SUPABASE = `
export function createClient(){
  let session = null; const subs = [];
  const emit = (ev) => subs.forEach((cb) => cb(ev, session));
  try { const t = localStorage.getItem('fake_session'); if (t) session = { access_token: t }; } catch {}
  return { auth: {
    async signInWithOtp({ email }) { window.__otpEmail = email; return { error: null }; },
    async verifyOtp({ token }) { if (token !== '123456') return { error: { message: 'bad' } }; session = { access_token: 'tokA' }; localStorage.setItem('fake_session', 'tokA'); emit('SIGNED_IN'); return { error: null }; },
    async getSession() { return { data: { session } }; },
    async signOut() { session = null; localStorage.removeItem('fake_session'); emit('SIGNED_OUT'); return { error: null }; },
    onAuthStateChange(cb) { subs.push(cb); setTimeout(() => cb('INITIAL_SESSION', session)); return { data: { subscription: { unsubscribe() {} } } }; },
  } };
}`;
const FAKE_PADDLE = `window.Paddle = { Environment: { set() {} }, Initialize(o) { window.__paddleInit = o; },
  Checkout: { open(o) { window.__checkout = o; setTimeout(() => window.__paddleInit.eventCallback({ name: 'checkout.completed', data: { transaction_id: 'txn_testtesttest01' } }), 300); }, close() {} } };`;
const CONFIG = `export const BRAND = { name: 'אתר בשיחה', supportWhatsApp: '972500000000', supportEmail: 'help@example.com', legalName: 'בדיקות בע״מ', businessId: '512345678' };
export const SUPABASE = { url: 'https://fake.supabase.co', anonKey: 'anon' };
export const PADDLE = { clientToken: 'test_x', priceId: 'pri_test', environment: 'sandbox' };
export const PRICE_LABEL = '49 ₪ לחודש';`;

const browser = await chromium.launch();
async function page(opts) {
  const ctx = await browser.newContext(opts);
  await ctx.route('**/supabase-js@*/**', (r) => r.fulfill({ contentType: 'text/javascript', body: FAKE_SUPABASE }));
  await ctx.route('https://cdn.paddle.com/**', (r) => r.fulfill({ contentType: 'text/javascript', body: FAKE_PADDLE }));
  await ctx.route(`${BASE}/config.js`, (r) => r.fulfill({ contentType: 'text/javascript', body: CONFIG }));
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  p.on('dialog', (d) => (d.type() === 'prompt' ? d.accept('מחיקה') : d.accept()));
  return p;
}

try {
  // 1. Landing + legal pages
  let p = await page({ viewport: { width: 1440, height: 900 } });
  await p.goto(BASE + '/'); await p.waitForTimeout(4200);
  await p.screenshot({ path: `${OUT}/e2e-landing.png` });
  check(await p.locator('nav b').textContent() === 'אתר בשיחה', 'landing shows brand from config');
  check(await p.locator('.wa').count() === 1, 'support WhatsApp button shown when configured');
  await p.goto(BASE + '/terms'); await p.waitForTimeout(400);
  check((await p.textContent('main')).includes('512345678'), 'terms show business id from config');
  check((await p.title()).includes('אתר בשיחה'), 'legal page title uses brand');

  // 2. Sign in with an email code
  await p.goto(BASE + '/app'); await p.waitForTimeout(500);
  check(await p.isVisible('#emailForm'), 'signed-out visitor sees the email form');
  await p.fill('#email', 'owner@example.com'); await p.click('#emailForm button[type=submit]');
  await p.waitForSelector('#codeForm:not([hidden])');
  await p.fill('#code', '000000'); await p.click('#codeForm button[type=submit]'); await p.waitForTimeout(300);
  check((await p.textContent('#authMsg')).includes('שגוי'), 'wrong code shows an error');
  await p.fill('#code', '123456'); await p.click('#codeForm button[type=submit]');
  await p.waitForSelector('#app:not([hidden])');
  check(await p.textContent('#usage').then((t) => t.includes('30')), 'free plan usage shown (30 messages)');

  // 3. Conversation builds the site
  const say = async (t) => { await p.fill('#input', t); await p.press('#input', 'Enter'); await p.waitForFunction(() => !document.getElementById('typing'), null, { timeout: 15000 }); await p.waitForTimeout(300); };
  await say('יש לי סטודיו לקוסמטיקה בחיפה');
  check(await p.isVisible('#empty'), 'no site yet after the first answer');
  await say('טיפולי פנים ולק ג׳ל');
  check(!(await p.isVisible('#empty')), 'site preview appears after the second answer');
  check((await p.frameLocator('#preview').locator('h1').textContent()).includes('סיוון'), 'preview renders the business name');
  check(await p.textContent('#usage').then((t) => t.includes('28')), 'free messages counted (28 left)');

  // 4. Photo upload
  await p.setInputFiles('#files', [new URL('./fixtures/photo.webp', import.meta.url).pathname]);
  await p.waitForSelector('#photos img', { timeout: 10000 });
  check(deps.store.files.size === 1, 'photo stored on the server');
  await p.waitForTimeout(1500);
  check(await p.frameLocator('#preview').locator('.disc img').evaluate((img) => img.complete && img.naturalWidth > 0), 'uploaded photo displays in the preview');

  // 5. Reload: everything comes back from the server
  await p.reload(); await p.waitForSelector('#app:not([hidden])'); await p.waitForTimeout(500);
  check(await p.locator('.msg.me').count() === 2, 'chat restored after reload');
  check(await p.locator('#photos img').count() === 1, 'photos restored after reload');
  await p.screenshot({ path: `${OUT}/e2e-app.png` });

  // 6. Publish → paywall → pay → published
  await p.click('#publishBtn'); await p.fill('#slug', 'Bad Slug'); await p.click('#pubGo'); await p.waitForTimeout(300);
  await p.fill('#slug', 'sivan-beauty'); await p.click('#pubGo');
  await p.waitForSelector('.pay');
  check(true, 'publishing without a subscription shows the paywall');
  await p.screenshot({ path: `${OUT}/e2e-paywall.png` });
  await p.click('.pay button');
  await p.waitForSelector('#pill.live', { timeout: 15000 }); await p.waitForTimeout(2500);
  const co = await p.evaluate(() => window.__checkout);
  check(co.customData.user_id === 'user-a' && co.customer.email === 'owner@example.com', 'checkout carries the user id and email');
  const live = await p.getAttribute('#liveLink', 'href');
  check(live.endsWith('/s/sivan-beauty'), 'site is live after payment: ' + live);
  check(await p.textContent('#usage').then((t) => t.includes('מנוי פעיל')), 'usage line switches to subscription');
  await p.screenshot({ path: `${OUT}/e2e-live.png` });

  // 7. Paid edit
  await say('תעשי את האתר ירוק');
  const theme = (await deps.store.siteByOwner('user-a')).spec.theme;
  check(theme === 'emerald', 'edit after subscribing updates the site');

  // 8. The public site
  const pub = await page({ ...devices['iPhone 13'] });
  const resp = await pub.goto(`${BASE}/s/sivan-beauty`); await pub.waitForTimeout(1200);
  check(resp.status() === 200, 'published site responds 200');
  check(await pub.locator('.disc img').evaluate((img) => img.complete && img.naturalWidth > 0), 'photo displays on the published site');
  check((await pub.textContent('body')).includes('נבנה עם אתר בשיחה') || (await pub.textContent('body')).includes('נבנה עם'), 'published site carries the credit line');
  check(await pub.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'published site has no horizontal scroll on a phone');
  await pub.screenshot({ path: `${OUT}/e2e-public-mobile.png` });
  check((await pub.goto(`${BASE}/s/nobody-here`)).status() === 404, 'unknown address is 404');

  // 9. Cancel, then delete the account
  await p.click('#menuBtn'); await p.click('#cancelSub'); await p.waitForTimeout(500);
  check(deps.paddle.canceled.at(-1)?.[1] === 'next_billing_period', 'cancel from the menu reaches Paddle (end of period)');
  await p.click('#menuBtn'); await p.click('#deleteAcc');
  await p.waitForSelector('#authView:not([hidden])', { timeout: 10000 });
  check(deps.paddle.canceled.at(-1)?.[1] === 'immediately', 'account deletion cancels billing immediately');
  check((await deps.store.siteByOwner('user-a')) === null && deps.store.files.size === 0, 'account deletion erases site and photos');
  check((await pub.goto(`${BASE}/s/sivan-beauty`)).status() === 404, 'deleted site is offline');

  // 10. Phone layout of the app
  const m = await page({ ...devices['iPhone 13'] });
  await m.goto(BASE + '/'); await m.waitForTimeout(800);
  check(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'landing has no horizontal scroll on a phone');
  await m.screenshot({ path: `${OUT}/e2e-landing-mobile.png`, fullPage: false });
} catch (e) {
  errors.push('EXCEPTION: ' + e.message);
} finally {
  await browser.close(); server.close();
  console.log(errors.length ? errors.join('\n') : 'ALL CHECKS PASSED');
  process.exitCode = errors.length ? 1 : 0;
}
