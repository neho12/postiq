import { renderSite } from './render.js';
import { PADDLE, PRICE_LABEL } from './config.js';
import { SYSTEM_PROMPT } from './lib/prompt.js';
import { SITE_SPEC_SCHEMA, normalizeSpec } from './lib/site-spec.js';

const GREETING = 'היי! אני אבנה לכם אתר לעסק תוך כדי שיחה. ספרו לי במילים שלכם: מה העסק עושה, ולמי?';
const KEY = 'site_builder_v1';
const $ = (id) => document.getElementById(id);

// Preview mode: when this page runs inside a claude.ai artifact viewer, it talks
// to Claude through the viewer's own account (the `sample` capability) instead
// of /api/chat, and payment is skipped. Anywhere else window.claude is absent
// and the real server path below is used.
const previewSample = window.claude?.use ? window.claude.use('sample').catch(() => null) : Promise.resolve(null);

// ---------- state (kept in this browser only) ----------
const blank = () => ({ history: [], turns: [], bubbles: [{ who: 'bot', text: GREETING }], spec: null, photos: [], subscriptionId: '', pending: '' });
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
  const sample = await previewSample;
  if (sample) return sendPreview(sample, text);
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

// ---------- preview mode (claude.ai artifact) ----------
const PREVIEW_ERRORS = {
  not_granted: 'כדי שהתצוגה המקדימה תעבוד, צריך לאשר לעמוד להשתמש ב־Claude.',
  sampling_disabled: 'Claude לא זמין בחשבון הזה.',
  rate_limited: 'הגעתם למגבלת השימוש כרגע. נסו שוב מאוחר יותר.',
  session_expired: 'צריך להתחבר מחדש ל־claude.ai.',
  refused: 'Claude לא טיפל בבקשה הזו. נסו לנסח אחרת.',
};

async function sendPreview(sample, text) {
  setBusy(true);
  const context = `Context: mode=${state.spec ? 'edit' : 'interview'}; photos uploaded=${state.photos.length}.`;
  const userTurn = { role: 'user', content: `${context}\n\n${text}` };
  // sample() is memoryless and has no system prompt: the instructions and the
  // current site go in a leading user turn, then the page's own turn history.
  const intro = `${SYSTEM_PROMPT}\n\nThe site content right now (JSON): ${state.spec ? JSON.stringify(state.spec) : 'none yet'}\n\nThe conversation follows.`;
  const turns = [{ role: 'user', content: intro }, ...state.turns.slice(-60), userTurn];

  const applySpec = (input) => {
    const { spec, warnings } = normalizeSpec(input);
    state.spec = spec; save(); refreshPreview();
    return `Site updated and shown to the owner.${warnings.length ? ` Notes: ${warnings.join('; ')}.` : ''}`;
  };

  let el = null;
  const onText = ({ text: t }) => {
    typing(false);
    if (!el) el = bubble('bot', '', false);
    el.innerHTML = fmt(t);
    log.scrollTop = log.scrollHeight;
  };

  try {
    const limits = await sample.limits().catch(() => null);
    let reply;
    if (limits?.tools) {
      const tool = {
        name: 'update_site',
        description: 'Replace the whole site content with this version and show it to the owner. Always send every field; use empty strings or empty arrays for anything unknown. Returns a short confirmation.',
        inputSchema: SITE_SPEC_SCHEMA,
        execute: (input) => applySpec(input),
      };
      reply = (await sample(turns, { tools: [tool], onText })).text;
    } else {
      // This view cannot run page tools: ask for the reply and the site as JSON instead.
      const fields = Object.keys(SITE_SPEC_SCHEMA.properties).join(', ');
      const asJson = { role: 'user', content: `${userTurn.content}\n\nReply with only a JSON object: {"reply": "<your chat message>", "site": <the complete site content with the fields ${fields}, or null if you are not changing the site>}.` };
      const data = await sample.json([...turns.slice(0, -1), asJson]);
      if (data?.site && typeof data.site === 'object') applySpec(data.site);
      reply = String(data?.reply || (data?.site ? 'עדכנתי את האתר.' : ''));
      if (reply) onText({ text: reply });
    }
    setBusy(false);
    state.turns.push(userTurn, { role: 'assistant', content: reply || 'עדכנתי את האתר.' });
    if (reply) state.bubbles.push({ who: 'bot', text: reply });
    save();
  } catch (e) {
    setBusy(false);
    if (e?.code === 'refused' && el) { el.remove(); el = null; }
    if (el && e?.text) state.bubbles.push({ who: 'bot', text: e.text });
    if (e?.code !== 'cancelled') {
      if (!['not_granted', 'sampling_disabled', 'rate_limited'].includes(e?.code)) $('input').value = text;
      bubble('err', PREVIEW_ERRORS[e?.code] || 'משהו השתבש. ההודעה שלכם חזרה לתיבה, נסו לשלוח שוב.', false);
    }
    save();
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
$('download').onclick = async () => {
  if (!state.spec) return;
  const html = renderSite(state.spec, state.photos);
  const filename = `${(state.spec.business_name || 'site').replace(/[^\w֐-׿]+/g, '-')}.html`;
  // Inside a claude.ai artifact, plain download links are blocked; use the platform's save dialog.
  const downloads = window.claude?.use ? await window.claude.use('downloads').catch(() => null) : null;
  if (downloads) {
    try { await downloads.save({ filename, data: html }); } catch (e) { /* viewer declined or unavailable */ }
    return;
  }
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
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
previewSample.then((s) => {
  if (s) note('תצוגה מקדימה: השיחה רצה על חשבון Claude שלכם, והתשלום מושבת.');
  else if (state.pending && state.spec && !state.subscriptionId) paywall();
});
