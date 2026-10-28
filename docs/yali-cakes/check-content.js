#!/usr/bin/env node
/*
 * YALI CAKES content check.
 * Opens yali-cakes/ in a headless browser, walks every section and every form,
 * and compares the text on screen with docs/yali-cakes/CONTENT.md word by word.
 *
 *   node docs/yali-cakes/check-content.js            (needs the `playwright` package)
 *   MOTION=1 node docs/yali-cakes/check-content.js   (same check with animations on)
 *
 * Exit code 0 when nothing differs, 1 otherwise.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const SITE = path.join(ROOT, 'yali-cakes');
const CONTENT = fs.readFileSync(path.join(__dirname, 'CONTENT.md'), 'utf8');

/* ---------- CONTENT.md parsing ---------- */
const lines = CONTENT.split('\n');
function sectionText(startRe, endRe) {
  const i = lines.findIndex((l) => startRe.test(l));
  if (i < 0) throw new Error('section not found: ' + startRe);
  let j = lines.findIndex((l, k) => k > i && endRe.test(l));
  if (j < 0) j = lines.length;
  return lines.slice(i + 1, j).join('\n');
}
function codeBlocks(text) {
  const out = [];
  const re = /```\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text))) out.push(m[1]);
  return out;
}
function formSection(heading) {
  const t = sectionText(new RegExp('^#### ' + escapeRe(heading)), /^(#### |## )/);
  const blocks = codeBlocks(t);
  const placeholders = {};
  t.split('\n').forEach((l) => {
    const m = /^- (.+?) \((\w+)\)(?: \| placeholder: (.*))?$/.exec(l);
    if (m) placeholders[m[1]] = { type: m[2], placeholder: m[3] || '' };
  });
  return { text: blocks[0], wa: blocks[1], fields: placeholders };
}
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

const expected = {
  title: /title\): (.*)$/m.exec(CONTENT)[1].trim(),
  description: /description\): (.*)$/m.exec(CONTENT)[1].trim(),
  hero: codeBlocks(sectionText(/^## 1\./, /^## 2\./))[0],
  cakesIntro: codeBlocks(sectionText(/^## 2\./, /^### טפסי/))[0],
  cards: sectionText(/^## 2\./, /^### טפסי/).split('\n').filter((l) => /^- /.test(l)).map((l) => l.slice(2)),
  hint: /הנחיה מתחת לכרטיסים: (.*)$/m.exec(CONTENT)[1].trim(),
  forms: {
    torte: formSection('עוגה מעוצבת - '),
    number: formSection('1 - עוגת מספרים'),
    mousse: formSection('עוגת מוס - '),
    bento: formSection('עוגת בנטו - '),
    garden: formSection('עוגת גן - ')
  },
  works: codeBlocks(sectionText(/^## 3\./, /^## 4\./))[0],
  workshops: codeBlocks(sectionText(/^## 4\./, /^## 5\./)),
  desserts: codeBlocks(sectionText(/^## 5\./, /^## 6\./)),
  about: codeBlocks(sectionText(/^## 6\./, /^## 7\./))[0],
  faq: codeBlocks(sectionText(/^## 7\./, /^## 8\./))[0],
  footer: codeBlocks(sectionText(/^## 8\./, /^## אינדקס/))[0],
  galleries: {}
};
{
  let cur = null;
  sectionText(/^## אינדקס/, /(?!)/).split('\n').forEach((l) => {
    const h = /^### (\w+)/.exec(l);
    if (h) { cur = h[1]; expected.galleries[cur] = []; return; }
    const m = /^- (\S+) \| (.*)$/.exec(l);
    if (m && cur) expected.galleries[cur].push({ file: m[1], alt: m[2].trim() });
  });
}
const NAV = sectionText(/^## ניווט/, /^## 1\./).split('\n').filter((l) => /->/.test(l)).map((l) => {
  const m = /^- (.*?) -> (\S+)$/.exec(l);
  return m ? { text: m[1].trim(), href: m[2] } : null;
}).filter(Boolean);

/* ---------- Word diff ---------- */
const norm = (s) => String(s || '').replace(/ /g, ' ').replace(/[‎‏]/g, '');
const toks = (s) => norm(s).split(/\s+/).filter(Boolean);
function diff(exp, act) {
  const a = toks(exp), b = toks(act);
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { ops.push(['=', a[i]]); i++; j++; }
    else if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) { ops.push(['+', b[j]]); j++; }
    else { ops.push(['-', a[i]]); i++; }
  }
  // Group into hunks with a little context.
  const hunks = [];
  for (let k = 0; k < ops.length; k++) {
    if (ops[k][0] === '=') continue;
    let s = k;
    while (k < ops.length && ops[k][0] !== '=') k++;
    const ctxB = ops.slice(Math.max(0, s - 4), s).map((o) => o[1]).join(' ');
    const ctxA = ops.slice(k, k + 4).filter((o) => o[0] === '=').map((o) => o[1]).join(' ');
    const del = ops.slice(s, k).filter((o) => o[0] === '-').map((o) => o[1]).join(' ');
    const ins = ops.slice(s, k).filter((o) => o[0] === '+').map((o) => o[1]).join(' ');
    hunks.push({ before: ctxB, missing: del, extra: ins, after: ctxA });
  }
  return hunks;
}

/* ---------- Static server ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp4': 'video/mp4' };
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(SITE, path.normalize(p));
      if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    }).listen(0, () => resolve(srv));
  });
}

/* ---------- Run ---------- */
(async () => {
  const srv = await serve();
  const url = 'http://localhost:' + srv.address().port + '/';
  const browser = await chromium.launch();
  // MOTION=1 runs with animations on (word-split headlines and so on); the default turns them off.
  const motion = !!process.env.MOTION;
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: motion ? 'no-preference' : 'reduce' })).newPage();
  // Block third-party requests (analytics, fonts) so the check is offline and deterministic.
  await page.route('**/*', (r) => (r.request().url().startsWith(url) ? r.continue() : r.abort()));
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto(url, { waitUntil: 'load' });
  if (motion) await page.waitForTimeout(5500);

  const report = [];
  const check = (name, exp, act) => report.push({ name, hunks: diff(exp, act) });
  const text = (sel) => page.$eval(sel, (el) => el.innerText);

  // Meta
  report.push({ name: 'מטא: כותרת הדף', hunks: diff(expected.title, await page.title()) });
  report.push({ name: 'מטא: תיאור', hunks: diff(expected.description, await page.$eval('meta[name=description]', (m) => m.content)) });

  // Navigation links and social links
  const links = await page.$$eval('#site-nav a, .site-foot .soc', (as) => as.map((a) => ({ text: a.innerText.trim(), href: a.getAttribute('href'), label: a.getAttribute('aria-label') || '' })));
  const navIssues = [];
  NAV.forEach((n) => { if (!links.some((l) => l.href === n.href && (n.text === '' || l.text === n.text || l.label === n.text))) navIssues.push('קישור חסר: ' + (n.text || '(אייקון)') + ' -> ' + n.href); });
  const socials = links.filter((l) => /instagram|tiktok/.test(l.href));
  if (socials.length !== 4) navIssues.push('מספר קישורי רשתות חברתיות: ' + socials.length + ' (צפוי 4)');
  report.push({ name: 'ניווט וקישורי רשתות', hunks: navIssues.map((x) => ({ note: x })) });

  // 1. Hero (navigation + hero copy)
  check('1. הירו', expected.hero, (await page.$$eval('#site-nav .nav-link', (as) => as.map((a) => a.innerText).join('\n'))) + '\n' + (await text('#top')));

  // 2. Cakes intro, cards and hint
  check('2. הזמנת עוגה: הקדמה', expected.cakesIntro, await text('#cakes .sec-head'));
  const cards = await page.$$eval('.typecard', (cs) => cs.map((c) => c.querySelector('.tc-title').innerText + ' - ' + c.querySelector('.tc-desc').innerText));
  expected.cards.forEach((exp, i) => check('2. כרטיס עוגה ' + (i + 1), exp, cards[i] || ''));
  check('2. הנחיה מתחת לכרטיסים', expected.hint, await text('#orderHint'));

  // Order forms, one per cake type
  const typeName = { torte: 'עוגה מעוצבת', number: 'עוגת מספרים', mousse: 'עוגת מוס', bento: 'עוגת בנטו', garden: 'עוגת גן' };
  for (const t of Object.keys(typeName)) {
    await page.click('.typecard[data-type="' + t + '"]');
    const exp = expected.forms[t];
    const shown = await page.evaluate((t) => {
      const f = document.querySelector('[data-form="' + t + '"]');
      return f.innerText + '\n' + document.querySelector('.form-foot').innerText + '\n' + document.querySelector('.summary').innerText;
    }, t);
    check('טופס ' + typeName[t] + ': טקסט מוצג וסיכום', exp.text, shown);
    // Field types and placeholders
    const fields = await page.evaluate((t) => Array.from(document.querySelectorAll('[data-form="' + t + '"] .grp')).filter((g) => !g.closest('[hidden]')).map((g) => {
      const f = g.querySelector('.field');
      return { label: g.querySelector('.lbl').innerText.trim(), type: f.tagName === 'TEXTAREA' ? 'textarea' : f.type, placeholder: f.placeholder || '' };
    }), t);
    const fNotes = [];
    Object.entries(exp.fields).forEach(([label, want]) => {
      const got = fields.find((f) => f.label === label);
      if (!got) return fNotes.push({ note: 'שדה חסר: ' + label });
      if (got.type !== want.type) fNotes.push({ note: 'סוג שדה שונה ב"' + label + '": ' + got.type + ' (צפוי ' + want.type + ')' });
      if (norm(got.placeholder) !== norm(want.placeholder)) fNotes.push({ note: 'placeholder שונה ב"' + label + '": "' + got.placeholder + '" (צפוי "' + want.placeholder + '")' });
    });
    fields.forEach((f) => { if (!exp.fields[f.label]) fNotes.push({ note: 'שדה נוסף שלא מופיע ברשימה: ' + f.label }); });
    report.push({ name: 'טופס ' + typeName[t] + ': שדות ו-placeholders', hunks: fNotes });
    // WhatsApp message with default values
    const href = await page.$eval('.form-foot [data-wa]', (a) => a.href);
    check('טופס ' + typeName[t] + ': הודעת וואטסאפ', exp.wa, decodeURIComponent(href));
  }
  await page.click('.typecard[aria-pressed="true"]');

  // 3. Inspiration gallery heading
  check('3. קצת מהעבודות שלנו', expected.works, await text('.works .sec-head'));

  // 4. Workshops (with the quote form open)
  await page.click('[data-toggle="quote"]');
  check('4. סדנאות (טופס פתוח)', expected.workshops[0], await text('#workshops'));
  check('4. סדנאות: הודעת וואטסאפ', expected.workshops[1], decodeURIComponent(await page.$eval('[data-wa="quote"]', (a) => a.href)));

  // 5. Dessert tables (with the quote form open)
  await page.click('[data-toggle="dessert-quote"]');
  check('5. שולחנות קינוחים (טופס פתוח)', expected.desserts[0], await text('#desserts'));
  check('5. שולחנות קינוחים: הודעת וואטסאפ', expected.desserts[1], decodeURIComponent(await page.$eval('[data-wa="dessert"]', (a) => a.href)));

  // 6. About
  check('6. עליי', expected.about, await text('#about'));

  // 7. FAQ (all answers open)
  await page.$$eval('#faq details', (ds) => ds.forEach((d) => { d.open = true; }));
  check('7. שאלות נפוצות', expected.faq, await text('#faq'));

  // 8. Footer: terms, privacy, accessibility (all open)
  await page.$$eval('#legal details', (ds) => ds.forEach((d) => { d.open = true; }));
  check('8. פוטר', expected.footer, await text('.site-foot'));

  // Galleries: files and alt text, in order
  for (const [id, want] of Object.entries(expected.galleries)) {
    const got = await page.$$eval('#' + id + ' img', (is) => is.map((i) => ({ file: i.getAttribute('src').split('/').pop(), alt: i.getAttribute('alt').trim() })));
    const notes = [];
    if (got.length !== want.length) notes.push({ note: 'מספר תמונות: ' + got.length + ' (צפוי ' + want.length + ')' });
    want.forEach((w, i) => {
      const g = got[i];
      if (!g) return;
      if (g.file !== w.file) notes.push({ note: 'תמונה ' + (i + 1) + ': ' + g.file + ' (צפוי ' + w.file + ')' });
      else if (norm(g.alt) !== norm(w.alt)) notes.push({ note: 'טקסט חלופי בתמונה ' + w.file + ': "' + g.alt + '" (צפוי "' + w.alt + '")' });
    });
    report.push({ name: 'גלריה ' + id, hunks: notes });
  }

  // House rules
  const html = await page.content();
  const rules = [];
  if (/₪/.test(html)) rules.push({ note: 'נמצא סימן ₪ בדף' });
  if (/מחיר\s*:/.test(html)) rules.push({ note: 'נמצאה שורת "מחיר:" בדף' });
  if (!/G-BJN2SX08TM/.test(html)) rules.push({ note: 'תג Google Analytics חסר' });
  if (await page.$('html[lang="he"][dir="rtl"]') === null) rules.push({ note: 'חסר lang="he" או dir="rtl"' });
  if (pageErrors.length) rules.push({ note: 'שגיאות JavaScript: ' + pageErrors.join(' | ') });
  report.push({ name: 'כללי הבית (מחירים, אנליטיקס, שפה)', hunks: rules });

  await browser.close();
  srv.close();

  /* ---------- Print ---------- */
  let total = 0;
  const out = ['# דוח בדיקת תוכן: YALI CAKES מול CONTENT.md', ''];
  report.forEach((r) => {
    total += r.hunks.length;
    out.push((r.hunks.length ? '✗ ' : '✓ ') + r.name + (r.hunks.length ? ' (' + r.hunks.length + ')' : ''));
    r.hunks.forEach((h) => {
      if (h.note) return out.push('    • ' + h.note);
      const where = (h.before ? '…' + h.before + ' ' : '') + '[ ]' + (h.after ? ' ' + h.after + '…' : '');
      out.push('    • במיקום: ' + where);
      if (h.missing) out.push('      חסר באתר:  "' + h.missing + '"');
      if (h.extra) out.push('      נוסף באתר: "' + h.extra + '"');
    });
  });
  out.push('', total ? 'סה"כ הבדלים: ' + total : 'אין הבדלים. כל הטקסט באתר תואם ל-CONTENT.md.');
  console.log(out.join('\n'));
  process.exit(total ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
