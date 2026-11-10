import { renderSite } from './render.js';
import { PADDLE, PRICE_LABEL } from './config.js';

const GREETING = 'היי! אני אבנה לכם אתר לעסק תוך כדי שיחה. ספרו לי במילים שלכם: מה העסק עושה, ולמי?';
const KEY = 'site_builder_v1';
const $ = (id) => document.getElementById(id);

// ---------- state (kept in this browser only) ----------
const blank = () => ({ history: [], bubbles: [{ who: 'bot', text: GREETING }], spec: null, photos: [], subscriptionId: '', pending: '' });
let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...blank(), ...JSON.parse(raw) };
  } catch (e) { /* storage blocked or corrupt: start fresh */ }
  return blank();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { note('לא הצלחתי לשמור בדפדפן (אולי יותר מדי תמונות). השיחה תישמר רק עד רענון הדף.'); }
}

// ---------- chat log ----------
const log = $('log');
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmt(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }

function bubble(who, text, persist = true) {
  const el = document.createElement('div');
  el.className = `msg ${who}`;
  el.innerHTML = fmt(text);
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  if (persist) { state.bubbles.push({ who, text }); save(); }
  return el;
}
const note = (t) => bubble('note', t, false);

function typing(on) {
  let el = $('typing');
  if (on && !el) {
    el = document.createElement('div');
    el.id = 'typing'; el.className = 'typing'; el.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(el); log.scrollTop = log.scrollHeight;
  } else if (!on && el) el.remove();
}

// ---------- preview ----------
function refreshPreview() {
  const has = Boolean(state.spec);
  $('empty').hidden = has;
  $('download').disabled = !has;
  if (has) $('preview').srcdoc = renderSite(state.spec, state.photos);
}

// ---------- photos ----------
function shrink(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => {
      const im = new Image();
      im.onerror = reject;
      im.onload = () => {
        const max = 1100, k = Math.min(1, max / Math.max(im.width, im.height));
        const c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.8));
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  });
}
function drawPhotos() {
  const box = $('photos'); box.innerHTML = '';
  state.photos.forEach((src, i) => {
    const d = document.createElement('div');
    d.innerHTML = `<img src="${src}" alt="תמונה ${i + 1}"><button type="button" aria-label="הסרת תמונה ${i + 1}">×</button>`;
    d.querySelector('button').onclick = () => { state.photos.splice(i, 1); save(); drawPhotos(); refreshPreview(); };
    box.appendChild(d);
  });
}
$('files').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []).slice(0, Math.max(0, 8 - state.photos.length));
  e.target.value = '';
  if (!files.length) return note('אפשר עד 8 תמונות.');
  try {
    state.photos.push(...await Promise.all(files.map(shrink)));
    save(); drawPhotos(); refreshPreview();
    note(files.length === 1 ? 'התמונה נוספה. הראשונה מופיעה בראש האתר, והשאר בגלריה.' : `${files.length} תמונות נוספו. הראשונה מופיעה בראש האתר, והשאר בגלריה.`);
  } catch (err) { note('לא הצלחתי לקרוא את אחת התמונות.'); }
});

// ---------- talking to the server ----------
let busy = false;
function setBusy(on) { busy = on; $('send').disabled = on; typing(on); }

async function send(text) {
  if (busy || !text.trim()) return;
  setBusy(true);
  let res, data;
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history: state.history, text, photos: state.photos.length, hasSite: Boolean(state.spec), subscriptionId: state.subscriptionId }),
    });
    data = await res.json().catch(() => ({}));
  } catch (e) {
    setBusy(false);
    $('input').value = text;
    return bubble('err', 'אין חיבור לשרת. בדקו את האינטרנט ונסו שוב.', false);
  }
  setBusy(false);

  if (res.ok) {
    state.history.push(...data.messages);
    state.pending = '';
    if (data.spec) { state.spec = data.spec; refreshPreview(); }
    save();
    if (data.reply) bubble('bot', data.reply);
    return;
  }

  // the owner's message was not processed: put it back so nothing is lost
  const back = () => { $('input').value = text; };
  switch (data.error) {
    case 'subscription_required':
      state.pending = text; save();
      return paywall();
    case 'billing_not_configured':
      back(); return bubble('err', 'עריכה אחרי בניית האתר דורשת מנוי, ומערכת התשלום עוד לא הוגדרה כאן.', false);
    case 'interview_limit':
      return bubble('err', 'הגענו למספר ההודעות המקסימלי לשיחת היכרות. אפשר להתחיל מחדש.', false);
    case 'busy':
      back(); return bubble('err', 'יש עומס כרגע. נסו שוב בעוד דקה.', false);
    default:
      back(); return bubble('err', 'משהו השתבש. ההודעה שלכם חזרה לתיבה, נסו לשלוח שוב.', false);
  }
}

// ---------- paywall (Paddle) ----------
function paywall() {
  const box = document.createElement('div');
  box.className = 'pay';
  box.innerHTML = `<h3>האתר מוכן. כדי לשנות ולהוסיף תוכן, צריך מנוי</h3>
    <p>${esc(PRICE_LABEL)}. אחרי ההרשמה הבקשה שלכם תישלח מעצמה.</p>
    <button class="btn" type="button">להרשמה למנוי</button>`;
  const btn = box.querySelector('button');
  if (!PADDLE.clientToken || !PADDLE.priceId) {
    btn.disabled = true; btn.textContent = 'התשלום עוד לא הוגדר';
  } else btn.onclick = () => openCheckout(btn);
  log.appendChild(box); log.scrollTop = log.scrollHeight;
}

let paddleReady = null;
function loadPaddle() {
  if (paddleReady) return paddleReady;
  paddleReady = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    s.onload = () => {
      if (PADDLE.environment === 'sandbox') window.Paddle.Environment.set('sandbox');
      window.Paddle.Initialize({
        token: PADDLE.clientToken,
        eventCallback: (ev) => { if (ev.name === 'checkout.completed') onPaid(ev.data?.transaction_id); },
      });
      resolve(window.Paddle);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return paddleReady;
}
async function openCheckout(btn) {
  btn.disabled = true;
  try {
    const P = await loadPaddle();
    P.Checkout.open({ items: [{ priceId: PADDLE.priceId, quantity: 1 }], settings: { displayMode: 'overlay', locale: 'he' } });
  } catch (e) { bubble('err', 'לא הצלחתי לפתוח את התשלום. נסו שוב.', false); }
  btn.disabled = false;
}
async function onPaid(transactionId) {
  note('מאמת את התשלום...');
  for (let i = 0; i < 8; i++) {
    try {
      const r = await fetch('/api/verify-subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactionId }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.subscriptionId) {
        state.subscriptionId = d.subscriptionId; save();
        window.Paddle?.Checkout?.close?.();
        bubble('bot', 'המנוי פעיל. עכשיו אפשר לבקש כל שינוי באתר.');
        if (state.pending) { const t = state.pending; bubble('me', t); return send(t); }
        return;
      }
      if (r.status !== 202) break;
    } catch (e) { /* retry */ }
    await new Promise((ok) => setTimeout(ok, 2500));
  }
  bubble('err', 'התשלום התקבל אבל עדיין לא אומת. רעננו את הדף בעוד דקה, או פנו אלינו.', false);
}

// ---------- composer ----------
const input = $('input');
function grow() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 160) + 'px'; }
input.addEventListener('input', grow);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('form').requestSubmit(); }
});
$('form').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || busy) return;
  input.value = ''; grow();
  bubble('me', text);
  send(text);
});

// ---------- toolbar ----------
$('reset').onclick = () => {
  if (!confirm('למחוק את השיחה ואת האתר ולהתחיל מחדש?')) return;
  const sub = state.subscriptionId;
  state = blank(); state.subscriptionId = sub; save();
  log.innerHTML = ''; state.bubbles.forEach((b) => bubble(b.who, b.text, false));
  drawPhotos(); refreshPreview(); $('preview').srcdoc = '';
};
$('download').onclick = () => {
  if (!state.spec) return;
  const blob = new Blob([renderSite(state.spec, state.photos)], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(state.spec.business_name || 'site').replace(/[^\w֐-׿]+/g, '-')}.html`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};
const frame = $('frame');
$('dDesk').onclick = () => { frame.classList.remove('mobile'); $('dDesk').setAttribute('aria-pressed', 'true'); $('dMob').setAttribute('aria-pressed', 'false'); };
$('dMob').onclick = () => { frame.classList.add('mobile'); $('dMob').setAttribute('aria-pressed', 'true'); $('dDesk').setAttribute('aria-pressed', 'false'); };
const app = $('app');
$('vChat').onclick = () => { app.dataset.view = 'chat'; $('vChat').setAttribute('aria-pressed', 'true'); $('vSite').setAttribute('aria-pressed', 'false'); };
$('vSite').onclick = () => { app.dataset.view = 'site'; $('vSite').setAttribute('aria-pressed', 'true'); $('vChat').setAttribute('aria-pressed', 'false'); };

// ---------- boot ----------
state.bubbles.forEach((b) => bubble(b.who, b.text, false));
drawPhotos();
refreshPreview();
if (state.pending && state.spec && !state.subscriptionId) paywall();
