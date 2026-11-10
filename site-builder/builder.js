import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { renderSite } from './render.js';
import { BRAND, SUPABASE, PADDLE, PRICE_LABEL } from './config.js';

const GREETING = 'היי! אני אבנה לכם אתר לעסק תוך כדי שיחה. ספרו לי במילים שלכם: מה העסק עושה, ולמי?';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

let sb = null;
let me = null;        // { user, site, limits }
let busy = false;
let afterPayment = null; // what to do once a subscription is confirmed

// ---------- auth ----------
function show(view) {
  $('authView').hidden = view !== 'auth';
  $('app').hidden = view !== 'app';
}
const authMsg = (t) => { $('authMsg').textContent = t || ''; };

async function sendCode(email) {
  authMsg('');
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) { authMsg(error.status === 429 ? 'נשלחו יותר מדי קודים. נסו שוב בעוד כמה דקות.' : 'לא הצלחנו לשלוח קוד. בדקו את הכתובת ונסו שוב.'); return false; }
  $('sentTo').textContent = email;
  $('emailForm').hidden = true; $('codeForm').hidden = false; $('code').value = ''; $('code').focus();
  return true;
}
$('emailForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.submitter; btn.disabled = true;
  await sendCode($('email').value.trim());
  btn.disabled = false;
});
$('codeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.submitter; btn.disabled = true; authMsg('');
  const { error } = await sb.auth.verifyOtp({ email: $('sentTo').textContent, token: $('code').value.trim(), type: 'email' });
  btn.disabled = false;
  if (error) authMsg('הקוד שגוי או שפג תוקפו. נסו שוב או בקשו קוד חדש.');
});
$('resend').onclick = () => sendCode($('sentTo').textContent);
$('back').onclick = () => { $('codeForm').hidden = true; $('emailForm').hidden = false; authMsg(''); };

// ---------- API ----------
async function api(path, { method = 'GET', body } = {}) {
  const { data } = await sb.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) { show('auth'); throw Object.assign(new Error('auth'), { status: 401 }); }
  const res = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) { await sb.auth.signOut(); show('auth'); }
  return { status: res.status, ok: res.ok, ...json };
}

// ---------- rendering ----------
const log = $('log');
function bubble(who, text) {
  const el = document.createElement('div');
  el.className = `msg ${who}`;
  el.innerHTML = fmt(text);
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}
const note = (t) => bubble('note', t);
function typing(on) {
  let el = $('typing');
  if (on && !el) {
    el = document.createElement('div'); el.id = 'typing'; el.className = 'typing'; el.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(el); log.scrollTop = log.scrollHeight;
  } else if (!on && el) el.remove();
}
function setBusy(on) { busy = on; $('send').disabled = on; typing(on); }

function renderChat() {
  log.innerHTML = '';
  bubble('bot', GREETING);
  for (const m of me.site?.chat || []) bubble(m.who === 'me' ? 'me' : 'bot', m.text);
}

function renderSiteState() {
  const s = me.site;
  const has = Boolean(s?.spec);
  $('empty').hidden = has;
  if (has) $('preview').srcdoc = renderSite(s.spec, s.photos.map((p) => p.url));
  else $('preview').srcdoc = '';
  $('publishBtn').disabled = !has;
  $('publishBtn').textContent = s?.published ? 'הגדרות פרסום' : 'פרסום האתר';
  $('pill').textContent = s?.published ? 'באוויר' : 'טיוטה';
  $('pill').classList.toggle('live', Boolean(s?.published));
  $('liveLink').hidden = !s?.liveUrl;
  if (s?.liveUrl) { $('liveLink').href = s.liveUrl; $('liveLink').textContent = s.liveUrl.replace(/^https?:\/\//, ''); }

  const box = $('photos'); box.innerHTML = '';
  (s?.photos || []).forEach((p, i) => {
    const d = document.createElement('div');
    d.innerHTML = `<img src="${esc(p.url)}" alt="תמונה ${i + 1}"><button type="button" aria-label="הסרת תמונה ${i + 1}">×</button>`;
    d.querySelector('button').onclick = () => removePhoto(p.path);
    box.appendChild(d);
  });

  const u = $('usage');
  if (s?.subscribed) u.textContent = `מנוי פעיל · נשארו ${s.monthLeft} הודעות החודש`;
  else u.textContent = `תוכנית חינמית · נשארו ${s ? s.freeLeft : me.limits.free} הודעות לבנייה. פרסום האתר: ${PRICE_LABEL}`;
  $('cancelSub').hidden = !s?.subscribed;
}

function applySite(site) { me.site = site; renderSiteState(); }

// ---------- chat ----------
async function send(text, retried = false) {
  if (busy) return;
  setBusy(true);
  let r;
  try { r = await api('/api/chat', { method: 'POST', body: { text } }); }
  catch (e) { setBusy(false); if (e.status !== 401) { $('input').value = text; bubble('err', 'אין חיבור לשרת. בדקו את האינטרנט ונסו שוב.'); } return; }
  setBusy(false);
  if (r.ok) { if (r.reply) bubble('bot', r.reply); applySite(r.site); return; }
  if (r.error === 'conflict' && !retried) { await new Promise((ok) => setTimeout(ok, 800)); return send(text, true); }
  if (r.error === 'free_limit') { $('input').value = text; return paywall('נגמרו ההודעות בתוכנית החינמית', `כדי להמשיך לשנות את האתר ולפרסם אותו, מצטרפים למנוי (${PRICE_LABEL}).`, () => { const t = $('input').value.trim(); if (t) { $('input').value = ''; bubble('me', t); send(t); } }); }
  if (r.error === 'monthly_limit') return bubble('err', 'הגעתם למכסת ההודעות של החודש. היא מתחדשת בתחילת החודש הבא.');
  if (r.error === 'busy') { $('input').value = text; return bubble('err', 'יש עומס כרגע. נסו שוב בעוד דקה.'); }
  if (r.status === 401) return;
  $('input').value = text;
  bubble('err', 'משהו השתבש. ההודעה שלכם חזרה לתיבה, נסו לשלוח שוב.');
}

const input = $('input');
function grow() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 160) + 'px'; }
input.addEventListener('input', grow);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('form').requestSubmit(); } });
$('form').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || busy) return;
  input.value = ''; grow();
  bubble('me', text);
  send(text);
});

// ---------- photos ----------
function shrink(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => {
      const im = new Image();
      im.onerror = reject;
      im.onload = () => {
        const k = Math.min(1, 1400 / Math.max(im.width, im.height));
        const c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  });
}
$('files').addEventListener('change', async (e) => {
  const room = me.limits.photos - (me.site?.photos?.length || 0);
  const files = Array.from(e.target.files || []).slice(0, Math.max(0, room));
  e.target.value = '';
  if (!files.length) return note(`אפשר עד ${me.limits.photos} תמונות.`);
  note('מעלה תמונות...');
  let added = 0;
  for (const f of files) {
    try {
      const r = await api('/api/photos', { method: 'POST', body: { data: await shrink(f) } });
      if (r.ok) { applySite(r.site); added++; } else if (r.error === 'conflict') { /* skip this one */ }
    } catch (err) { /* keep going */ }
  }
  note(added ? `${added} תמונות נוספו. הראשונה מופיעה בראש האתר, והשאר בגלריה.` : 'לא הצלחתי להעלות את התמונות. נסו קובץ JPG או PNG.');
});
async function removePhoto(path) {
  const r = await api('/api/photos', { method: 'DELETE', body: { path } }).catch(() => null);
  if (r?.ok) applySite(r.site); else note('לא הצלחתי להסיר את התמונה. נסו שוב.');
}

// ---------- publishing ----------
const dlg = $('publishDlg');
$('slugPrefix').textContent = `${location.host}/s/`;
$('publishBtn').onclick = () => {
  const s = me.site;
  $('pubTitle').textContent = s.published ? 'האתר באוויר' : 'פרסום האתר';
  $('pubLead').textContent = s.published ? 'אפשר לשנות את הכתובת או להוריד את האתר מהאוויר.' : `בחרו כתובת לאתר, באותיות באנגלית, מספרים ומקפים. הפרסום כלול במנוי (${PRICE_LABEL}).`;
  $('slug').value = s.slug || '';
  $('unpublish').hidden = !s.published;
  $('pubMsg').textContent = '';
  dlg.showModal();
};
$('pubClose').onclick = () => dlg.close();
const SLUG_ERRORS = {
  bad_slug: 'הכתובת יכולה להכיל רק אותיות באנגלית, מספרים ומקפים (3–40 תווים).',
  slug_taken: 'הכתובת הזו כבר תפוסה. נסו אחרת.',
  conflict: 'משהו השתנה בינתיים. נסו שוב.',
};
async function publish() {
  const slug = $('slug').value.trim().toLowerCase();
  $('pubGo').disabled = true; $('pubMsg').textContent = '';
  const r = await api('/api/publish', { method: 'POST', body: { action: 'publish', slug } }).catch(() => ({ error: 'network' }));
  $('pubGo').disabled = false;
  if (r.ok) { applySite(r.site); dlg.close(); return bubble('bot', 'האתר באוויר! הכתובת שלו מופיעה מעל האתר, ואפשר לשלוח אותה ללקוחות.'); }
  if (r.error === 'subscription_required') {
    dlg.close();
    return paywall('עוד צעד אחד והאתר באוויר', `הפרסום והעריכות אחרי הבנייה כלולים במנוי (${PRICE_LABEL}). אפשר לבטל בכל רגע.`, async () => { $('slug').value = slug; dlg.showModal(); await publish(); });
  }
  $('pubMsg').textContent = SLUG_ERRORS[r.error] || 'לא הצלחתי לפרסם. נסו שוב.';
}
$('publishForm').addEventListener('submit', (e) => { e.preventDefault(); publish(); });
$('unpublish').onclick = async () => {
  if (!confirm('להוריד את האתר מהאוויר? אפשר לפרסם אותו שוב בכל רגע.')) return;
  const r = await api('/api/publish', { method: 'POST', body: { action: 'unpublish' } }).catch(() => ({}));
  if (r.ok) { applySite(r.site); dlg.close(); note('האתר הורד מהאוויר.'); }
};

// ---------- payment (Paddle) ----------
function paywall(title, text, then) {
  afterPayment = then;
  const box = document.createElement('div');
  box.className = 'pay';
  box.innerHTML = `<h3>${esc(title)}</h3><p>${esc(text)}</p><button class="btn" type="button">להצטרפות למנוי</button>`;
  const btn = box.querySelector('button');
  if (!PADDLE.clientToken || !PADDLE.priceId) { btn.disabled = true; btn.textContent = 'התשלום עוד לא הוגדר'; }
  else btn.onclick = () => openCheckout(btn);
  log.appendChild(box); log.scrollTop = log.scrollHeight;
  $('vChat').click();
}

let paddleReady = null;
function loadPaddle() {
  if (paddleReady) return paddleReady;
  paddleReady = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    s.onload = () => {
      if (PADDLE.environment === 'sandbox') window.Paddle.Environment.set('sandbox');
      window.Paddle.Initialize({ token: PADDLE.clientToken, eventCallback: (ev) => { if (ev.name === 'checkout.completed') onPaid(ev.data?.transaction_id); } });
      resolve(window.Paddle);
    };
    s.onerror = () => { paddleReady = null; reject(new Error('paddle_load')); };
    document.head.appendChild(s);
  });
  return paddleReady;
}
async function openCheckout(btn) {
  btn.disabled = true;
  try {
    const P = await loadPaddle();
    P.Checkout.open({
      items: [{ priceId: PADDLE.priceId, quantity: 1 }],
      customer: { email: me.user.email },
      customData: { user_id: me.user.id },
      settings: { displayMode: 'overlay', locale: 'he' },
    });
  } catch (e) { bubble('err', 'לא הצלחתי לפתוח את התשלום. נסו שוב.'); }
  btn.disabled = false;
}
async function onPaid(transactionId) {
  note('מאמת את התשלום...');
  for (let i = 0; i < 10; i++) {
    const r = await api('/api/verify-subscription', { method: 'POST', body: { transactionId } }).catch(() => ({}));
    if (r.ok) {
      window.Paddle?.Checkout?.close?.();
      applySite(r.site);
      bubble('bot', 'המנוי פעיל. תודה!');
      const then = afterPayment; afterPayment = null;
      if (then) await then();
      return;
    }
    if (r.status !== 202 && r.status !== 503) break;
    await new Promise((ok) => setTimeout(ok, 2500));
  }
  bubble('err', 'התשלום התקבל אבל עדיין לא אומת. רעננו את הדף בעוד דקה. אם זה נמשך, פנו לתמיכה.');
}

// ---------- account menu ----------
const menu = $('menu');
$('menuBtn').onclick = () => { menu.hidden = !menu.hidden; $('menuBtn').setAttribute('aria-expanded', String(!menu.hidden)); };
document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target) && e.target !== $('menuBtn')) menu.hidden = true; });
if (BRAND.supportWhatsApp) { $('support').hidden = false; $('support').href = `https://wa.me/${BRAND.supportWhatsApp}`; }
$('signOut').onclick = async () => { menu.hidden = true; await sb.auth.signOut(); };
$('cancelSub').onclick = async () => {
  menu.hidden = true;
  if (!confirm('לבטל את המנוי? האתר יישאר באוויר עד סוף התקופה ששולמה, ולא יהיו חיובים נוספים.')) return;
  const r = await api('/api/subscription', { method: 'POST', body: { action: 'cancel' } }).catch(() => ({}));
  if (r.ok) bubble('bot', 'המנוי בוטל. האתר יישאר באוויר עד סוף התקופה ששולמה, ולא תחויבו שוב.');
  else bubble('err', 'לא הצלחתי לבטל כרגע. נסו שוב, או פנו לתמיכה.');
};
$('deleteAcc').onclick = async () => {
  menu.hidden = true;
  const typed = prompt('מחיקת החשבון מוחקת את האתר, התמונות והשיחה, ומבטלת מנוי פעיל מיידית. אי אפשר לשחזר.\n\nכדי לאשר, הקלידו: מחיקה');
  if (typed?.trim() !== 'מחיקה') return;
  const r = await api('/api/account', { method: 'DELETE', body: { confirm: 'DELETE' } }).catch(() => ({}));
  if (r.ok) { await sb.auth.signOut(); alert('החשבון נמחק.'); }
  else bubble('err', 'לא הצלחתי למחוק את החשבון כרגע. נסו שוב או פנו לתמיכה.');
};

// ---------- layout toggles ----------
const frame = $('frame');
$('dDesk').onclick = () => { frame.classList.remove('mobile'); $('dDesk').setAttribute('aria-pressed', 'true'); $('dMob').setAttribute('aria-pressed', 'false'); };
$('dMob').onclick = () => { frame.classList.add('mobile'); $('dMob').setAttribute('aria-pressed', 'true'); $('dDesk').setAttribute('aria-pressed', 'false'); };
const app = $('app');
$('vChat').onclick = () => { app.dataset.view = 'chat'; $('vChat').setAttribute('aria-pressed', 'true'); $('vSite').setAttribute('aria-pressed', 'false'); };
$('vSite').onclick = () => { app.dataset.view = 'site'; $('vSite').setAttribute('aria-pressed', 'true'); $('vChat').setAttribute('aria-pressed', 'false'); };

// ---------- boot ----------
async function enterApp() {
  const r = await api('/api/me').catch(() => null);
  if (!r?.ok) {
    show('auth');
    if (r?.status === 503) authMsg('השירות עוד לא הוגדר. נסו שוב מאוחר יותר.');
    return;
  }
  me = r;
  $('who').textContent = r.user.email;
  show('app');
  renderChat();
  renderSiteState();
  $('input').focus();
}

document.title = BRAND.name;
document.querySelectorAll('[data-brand]').forEach((el) => { el.textContent = BRAND.name; });

if (!SUPABASE.url || !SUPABASE.anonKey) {
  show('auth');
  $('emailForm').hidden = true;
  authMsg('האתר עוד לא חובר לשרת (חסרות הגדרות Supabase ב־config.js).');
} else {
  sb = createClient(SUPABASE.url, SUPABASE.anonKey);
  let entered = false;
  sb.auth.onAuthStateChange((event, session) => {
    if (session && !entered) { entered = true; enterApp(); }
    if (!session) { entered = false; me = null; show('auth'); }
  });
}
