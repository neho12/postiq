/* YALI CAKES: page behaviour. Forms build a WhatsApp message; nothing is stored or sent by the site. */
(function () {
  'use strict';

  var WHATSAPP = '0532850540';
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var lenis = null;

  /* ---------- State ---------- */
  var state = { type: '' };
  $$('.pills[data-key]').forEach(function (g) {
    var key = g.dataset.key;
    if (g.dataset.multi) { state[key] = state[key] || []; return; }
    var on = $('.pill[aria-pressed="true"]', g);
    if (on) state[key] = on.dataset.v;
    else if (!(key in state)) state[key] = '';
  });
  $$('.field[name]').forEach(function (f) { state[f.name] = f.value; });

  /* ---------- Message building ---------- */
  var dash = function (x) { return x && String(x).trim() ? String(x).trim() : 'לא צוין'; };
  var isPrem = function (key, v) { return $$('.pills[data-key="' + key + '"] .pill[data-prem]').some(function (p) { return p.dataset.v === v; }); };
  var hoursText = function (h) {
    var n = Number(h);
    return n === 1 ? 'כשעה' : n === 2 ? 'כשעתיים' : n === 0.5 ? 'כחצי שעה' : 'כ-' + h + ' שעות';
  };

  function order() {
    var s = state, title, lines;
    if (s.type === 'torte') {
      title = 'עוגה מעוצבת (טורט)';
      lines = [
        ['שם', dash(s.t_name)],
        ['תאריך האירוע', dash(s.t_date)],
        ['שעה', dash(s.t_time)],
        ['בסיס', s.t_base],
        ['מילוי', s.t_fill + (isPrem('t_fill', s.t_fill) ? ' (בתוספת תשלום)' : '')],
        ['חלבי או פרווה', s.t_dairy],
        ['כיתוב', dash(s.t_ins)],
        ['עיצוב', dash(s.t_design)],
        ['קישור לעיצוב', dash(s.t_link)],
        ['נסיעה', s.t_travel === 'כן' ? 'כן' + (s.t_hours ? ', ' + hoursText(s.t_hours) : '') : 'לא'],
        ['אלרגניים והערות', dash(s.t_notes)]
      ];
    } else if (s.type === 'number') {
      title = 'עוגת מספרים';
      lines = [
        ['שם', dash(s.n_name)],
        ['תאריך האירוע', dash(s.n_date)],
        ['שעה', dash(s.n_time)],
        ['מספר', dash(s.n_digit)],
        ['קישוט', s.n_decor],
        ['חלבי או פרווה', s.n_dairy],
        ['גודל', s.n_size],
        ['כיתוב', dash(s.n_ins)],
        ['אלרגניים והערות', dash(s.n_notes)]
      ];
    } else if (s.type === 'bento') {
      title = 'עוגת בנטו';
      lines = [
        ['שם', dash(s.b_name)],
        ['תאריך האירוע', dash(s.b_date)],
        ['שעה', dash(s.b_time)],
        ['כמות', dash(s.b_qty)],
        ['טעם', s.b_flavor],
        ['חלבי או פרווה', s.b_dairy],
        ['עיצוב', s.b_design],
        ['כיתוב', dash(s.b_ins)],
        ['אלרגניים והערות', dash(s.b_notes)]
      ];
    } else if (s.type === 'garden') {
      title = 'עוגת גן';
      lines = [
        ['סוג', s.g_kind],
        ['שם', dash(s.g_name)],
        ['תאריך האירוע', dash(s.g_date)],
        ['שעה', dash(s.g_time)],
        ['טעם', s.g_flavor],
        ['חלבי או פרווה', s.g_dairy],
        ['צבעי הקישוטים', dash(s.g_colors)]
      ].concat(s.g_kind === 'עוגה עם תמונה' ? [['קישור לתמונה', dash(s.g_link)]] : []).concat([
        ['כיתוב', dash(s.g_ins)],
        ['אלרגניים והערות', dash(s.g_notes)]
      ]);
    } else {
      title = 'עוגת מוס';
      lines = [
        ['שם', dash(s.m_name)],
        ['תאריך האירוע', dash(s.m_date)],
        ['שעה', dash(s.m_time)],
        ['קוטר', s.m_diam + ' ס״מ'],
        ['טעם', s.m_flavor + (isPrem('m_flavor', s.m_flavor) ? ' (בתוספת תשלום)' : '')],
        ['סוג', 'חלבי'],
        ['עיצוב', dash(s.m_design)],
        ['כיתוב', dash(s.m_ins)],
        ['אלרגניים והערות', dash(s.m_notes)]
      ];
    }
    return { title: title, lines: lines };
  }

  var num = WHATSAPP.replace(/\D/g, '');
  if (num.indexOf('0') === 0) num = '972' + num.slice(1);
  var wa = function (text) { return 'https://wa.me/' + num + (text ? '?text=' + encodeURIComponent(text) : ''); };

  function messages() {
    var s = state, o = order();
    return {
      order: 'היי, אשמח להזמין עוגה: ' + o.title + '\n' + o.lines.map(function (l) { return l[0] + ': ' + l[1]; }).join('\n'),
      quote: 'היי, אשמח לקבל הצעת מחיר לסדנת עיצוב עוגות.\nמיקום האירוע: ' + dash(s.w_place) + '\nתאריך: ' + dash(s.w_date) + '\nשעה: ' + dash(s.w_time) + '\nמספר משתתפים: ' + dash(s.w_count) + '\nגילאי המשתתפים: ' + dash(s.w_ages),
      dessert: 'היי, אשמח לקבל הצעת מחיר לשולחן קינוחים.\nסוג האירוע: ' + s.d_type +
        '\nמספר משתתפים: ' + dash(s.d_count) + '\nמיקום האירוע: ' + dash(s.d_place) +
        '\nתאריך האירוע: ' + dash(s.d_date) + '\nשעה: ' + dash(s.d_time) + '\nחלבי או פרווה: ' + s.d_dairy +
        '\nקינוחים: ' + (s.d_items.length ? s.d_items.join(', ') : 'לא נבחרו') +
        '\nשם: ' + dash(s.d_name) + '\nהערות: ' + dash(s.d_notes)
    };
  }

  /* ---------- Render ---------- */
  var summaryTitle = $('#summary-title');
  var summaryList = $('#summary-list');

  function render() {
    var o = order();
    summaryTitle.textContent = o.title;
    var prev = {};
    $$('.srow', summaryList).forEach(function (r) { prev[r.firstChild.textContent] = r.lastChild.textContent; });
    var sameType = summaryList.dataset.type === state.type;
    summaryList.dataset.type = state.type;
    summaryList.textContent = '';
    o.lines.forEach(function (l) {
      var row = document.createElement('div');
      row.className = 'srow';
      var dt = document.createElement('dt');
      var dd = document.createElement('dd');
      dt.textContent = l[0];
      dd.textContent = l[1];
      if (sameType && prev[l[0]] !== undefined && prev[l[0]] !== l[1]) dd.className = 'flash';
      row.appendChild(dt);
      row.appendChild(dd);
      summaryList.appendChild(row);
    });
    var m = messages();
    $$('[data-wa]').forEach(function (a) { a.href = wa(m[a.dataset.wa]); });

    $$('[data-show-when]').forEach(function (el) {
      var p = el.dataset.showWhen.split('=');
      el.hidden = state[p[0]] !== p[1];
    });
    $('#g-ins-lbl').textContent = state.g_kind === 'עוגה עם תמונה' ? 'כיתוב על העוגה (אופציונלי)' : 'כיתוב על עוגת האלופים (אופציונלי)';
  }

  /* ---------- Pills ---------- */
  $$('.pills[data-key]').forEach(function (g) {
    g.addEventListener('click', function (e) {
      var b = e.target.closest('.pill');
      if (!b) return;
      var key = g.dataset.key, v = b.dataset.v;
      if (g.dataset.multi) {
        var cur = state[key].slice(), i = cur.indexOf(v);
        if (i >= 0) cur.splice(i, 1); else cur.push(v);
        state[key] = cur;
        b.setAttribute('aria-pressed', i >= 0 ? 'false' : 'true');
      } else {
        state[key] = v;
        $$('.pills[data-key="' + key + '"] .pill').forEach(function (p) {
          p.setAttribute('aria-pressed', p.dataset.v === v ? 'true' : 'false');
        });
      }
      render();
    });
  });

  $$('.field[name]').forEach(function (f) {
    var upd = function () { state[f.name] = f.value; render(); };
    f.addEventListener('input', upd);
    f.addEventListener('change', upd);
  });

  /* ---------- Smooth reveal of a panel ---------- */
  function bringIntoView(el) {
    setTimeout(function () {
      var r = el.getBoundingClientRect();
      var head = 92;
      if (r.top >= head && r.top < window.innerHeight * 0.6) return;
      var y = window.scrollY + r.top - head;
      if (lenis) lenis.scrollTo(y, { duration: 1 });
      else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    }, 60);
  }
  function enter(el) {
    el.classList.remove('is-entering');
    void el.offsetWidth;
    el.classList.add('is-entering');
  }

  /* ---------- Cake type cards ---------- */
  var panel = $('#order-panel');
  var hint = $('#orderHint');
  $$('.typecard').forEach(function (card) {
    card.addEventListener('click', function () {
      var t = card.dataset.type;
      state.type = state.type === t ? '' : t;
      $$('.typecard').forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.type === state.type ? 'true' : 'false'); });
      $$('[data-form]').forEach(function (f) { f.hidden = f.dataset.form !== state.type; });
      panel.hidden = !state.type;
      hint.hidden = !!state.type;
      render();
      if (state.type) { enter(panel); bringIntoView(panel); }
    });
  });

  /* ---------- Quote forms (workshops, dessert tables) ---------- */
  $$('[data-toggle]').forEach(function (btn) {
    var target = document.getElementById(btn.dataset.toggle);
    var label = $('.btn-label', btn);
    btn.addEventListener('click', function () {
      var open = target.hidden;
      target.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      label.textContent = open ? btn.dataset.openLabel : btn.dataset.closedLabel;
      if (open) { enter(target); bringIntoView(target); }
    });
  });

  /* ---------- Galleries ---------- */
  function step(track) {
    var first = track.firstElementChild;
    if (!first) return track.clientWidth * 0.8;
    if (track.closest('.ex-gal')) return track.clientWidth;
    var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return first.getBoundingClientRect().width + gap;
  }
  function syncArrows(track) {
    var max = track.scrollWidth - track.clientWidth;
    var pos = Math.abs(track.scrollLeft);
    $$('.gal-btn[data-gal="' + track.id + '"]').forEach(function (b) {
      var atEdge = b.dataset.dir === 'prev' ? pos <= 2 : pos >= max - 2;
      b.disabled = max <= 2 || atEdge;
    });
    var bar = $('[data-progress="' + track.id + '"]');
    if (bar) bar.style.transform = 'scaleX(' + (max > 2 ? Math.max(0.08, Math.min(1, (pos + track.clientWidth) / track.scrollWidth)) : 1) + ')';
  }
  $$('.gal-btn[data-gal]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = document.getElementById(b.dataset.gal);
      if (!t) return;
      // RTL: "previous" moves toward the start (right), "next" toward the end (left).
      t.scrollBy({ left: (b.dataset.dir === 'prev' ? 1 : -1) * step(t), behavior: reduce ? 'auto' : 'smooth' });
    });
  });
  $$('.gal-track[id]').forEach(function (t) {
    var raf = 0;
    t.addEventListener('scroll', function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () { syncArrows(t); });
    }, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(function () { syncArrows(t); }).observe(t);
    syncArrows(t);
  });

  /* ---------- Header and menu ---------- */
  var head = $('#site-head');
  var bar = $('.scroll-bar');
  var lastY = window.scrollY;
  var onScroll = function () {
    var y = window.scrollY;
    head.classList.toggle('is-stuck', y > 24);
    if (!doc.classList.contains('menu-open')) head.classList.toggle('is-hidden', y > 640 && y > lastY + 2 && !head.contains(document.activeElement));
    if (y < lastY - 2 || y < 640) head.classList.remove('is-hidden');
    lastY = y;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Underline the section in view.
  if ('IntersectionObserver' in window) {
    var links = $$('#site-nav .nav-link');
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('is-current', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['cakes', 'workshops', 'desserts', 'about', 'faq', 'top'].forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });
  }

  var menuBtn = $('#menu-btn');
  var nav = $('#site-nav');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    nav.classList.toggle('is-open', open);
    doc.classList.toggle('menu-open', open);
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
  }
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });

  /* ---------- Hero video ---------- */
  var video = $('.banner-video');
  var vbtn = $('#vpause');
  function setPaused(p) {
    vbtn.dataset.paused = p ? 'true' : 'false';
    var l = p ? 'הפעלת הסרטון' : 'השהיית הסרטון';
    vbtn.setAttribute('aria-label', l);
    vbtn.title = l;
  }
  if (video) {
    video.muted = true;
    if (reduce) { video.removeAttribute('autoplay'); video.pause(); setPaused(true); }
    else { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    vbtn.addEventListener('click', function () {
      if (video.paused) { var pp = video.play(); if (pp && pp.catch) pp.catch(function () {}); setPaused(false); }
      else { video.pause(); setPaused(true); }
    });
  }

  /* ---------- Legal panels open from #terms, #privacy, #accessibility ---------- */
  function openLegal() {
    var d = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (d && d.tagName === 'DETAILS') d.open = true;
  }
  window.addEventListener('hashchange', openLegal);
  openLegal();

  render();

  /* ---------- Motion ---------- */
  if (reduce) return;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hero = $('#top');

  // Opening screen: the logo draws and fills, the two colour layers lift, then the hero comes in.
  (function opening() {
    var pre = $('.yl-pre');
    if (!pre) { hero.classList.add('is-in'); return; }
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var min = new Promise(function (r) { setTimeout(r, 3000); });
    var cap = new Promise(function (r) { setTimeout(r, 5000); });
    requestAnimationFrame(function () { requestAnimationFrame(function () { pre.classList.add('in'); }); });
    Promise.race([Promise.all([fonts, min]), cap]).then(function () {
      if (!location.hash) window.scrollTo(0, 0);
      pre.classList.add('out');
      setTimeout(function () { hero.classList.add('is-in'); }, 350);
      setTimeout(function () { doc.classList.add('fx-ready'); }, 300);
      setTimeout(function () { if (pre.parentNode) pre.parentNode.removeChild(pre); }, 1400);
    });
    // Safety net, matching the 7s fallback in <head>.
    setTimeout(function () { hero.classList.add('is-in'); }, 7200);
  })();

  // Split headlines and the quote into words (text stays exactly the same).
  function splitWords(el) {
    var i = 0;
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType !== 3) return;
      var frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var w = document.createElement('span');
        w.className = 'w';
        var inner = document.createElement('span');
        inner.className = 'w-in';
        inner.textContent = part;
        inner.style.setProperty('--i', i++);
        w.appendChild(inner);
        frag.appendChild(w);
      });
      n.parentNode.replaceChild(frag, n);
    });
  }
  $$('.split-words, .fill-words').forEach(splitWords);
  $$('.stagger').forEach(function (g) { Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty('--i', i); }); });

  doc.classList.add('fx');

  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());

    // In-page links glide. The hashchange handler (legal panels) still runs.
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
      var hash = a.getAttribute('href');
      if (hash.length < 2) return;
      var target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (!target) return;
      e.preventDefault();
      if (location.hash !== hash) {
        history.pushState(null, '', hash);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
      requestAnimationFrame(function () {
        lenis.scrollTo(target, { offset: hash === '#top' ? 0 : -84, duration: 1.3 });
        if (!/^(A|BUTTON|INPUT|TEXTAREA|SELECT|SUMMARY)$/.test(target.tagName) && target.tabIndex < 0) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    });
  }

  // First-view reveals.
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    $$('.rv, .rv-clip, .stagger, .split-words').forEach(function (el) { io.observe(el); });
  } else {
    $$('.rv, .rv-clip, .stagger, .split-words').forEach(function (el) { el.classList.add('in'); });
  }

  // Scroll-linked: gentle parallax inside frames, the watermark drift, and the quote filling in.
  var pars = $$('[data-par]');
  var mark = $('.watermark');
  var fillWords = $$('.fill-words .w');
  var fillBox = $('.fill-words');
  function onFrame() {
    var vh = window.innerHeight;
    pars.forEach(function (el) {
      var r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var p = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.transform = 'translateY(' + (p * -7).toFixed(2) + '%) scale(1.12)';
    });
    if (mark) {
      var mr = mark.parentElement.getBoundingClientRect();
      if (mr.bottom > 0 && mr.top < vh) mark.style.transform = 'translateY(' + (mr.top * -0.12).toFixed(1) + 'px) rotate(' + (mr.top * 0.01).toFixed(2) + 'deg)';
    }
    if (fillBox) {
      var fr = fillBox.getBoundingClientRect();
      var prog = Math.min(1, Math.max(0, (vh * 0.85 - fr.top) / (vh * 0.5)));
      var n = Math.round(prog * fillWords.length);
      fillWords.forEach(function (w, i) { w.classList.toggle('on', i < n); });
    }
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { onFrame(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', onFrame);
  onFrame();

  // Answers and legal panels open and close smoothly.
  $$('.acc details, .legal details').forEach(function (d) {
    var sum = $('summary', d);
    sum.addEventListener('click', function (e) {
      if (!d.animate) return;
      e.preventDefault();
      var start = d.offsetHeight;
      if (d.open) {
        var end = sum.offsetHeight;
        var a = d.animate({ height: [start + 'px', end + 'px'] }, { duration: 450, easing: 'cubic-bezier(.2,.7,.2,1)' });
        a.onfinish = function () { d.open = false; };
      } else {
        d.open = true;
        var full = d.offsetHeight;
        d.animate({ height: [start + 'px', full + 'px'] }, { duration: 550, easing: 'cubic-bezier(.2,.7,.2,1)' });
      }
    });
  });

  if (!fine) return;

  // Primary buttons lean toward the pointer.
  $$('.magnet').forEach(function (b) {
    b.addEventListener('pointermove', function (e) {
      var r = b.getBoundingClientRect();
      var x = (e.clientX - r.left - r.width / 2) / r.width;
      var y = (e.clientY - r.top - r.height / 2) / r.height;
      b.style.transform = 'translate(' + (x * 10).toFixed(1) + 'px,' + (y * 8).toFixed(1) + 'px)';
    });
    b.addEventListener('pointerleave', function () { b.style.transform = ''; });
  });

  // Photo rows can be dragged with the mouse.
  $$('[data-drag]').forEach(function (t) {
    var down = false, startX = 0, startLeft = 0, moved = false;
    t.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; startX = e.clientX; startLeft = t.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (!moved && Math.abs(dx) < 4) return;
      if (!moved) { moved = true; t.classList.add('is-dragging'); }
      t.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      if (!moved) return;
      t.classList.remove('is-dragging');
      // Settle on the nearest photo.
      var s = step(t);
      t.scrollTo({ left: Math.round(t.scrollLeft / s) * s, behavior: 'smooth' });
    });
  });
})();
