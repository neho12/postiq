/* YALI CAKES: behaviour for the additions (top menu, gallery arrows, smooth FAQ and legal sections). */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Top menu: a floating capsule after scrolling. On desktop it hides on the way
     down; on phones and tablets it stays, since the section links live in it. ---------- */
  var head = document.getElementById('yp-head');
  if (head) {
    var lastY = window.scrollY;
    var wide = window.matchMedia('(min-width: 901px)');
    var onScroll = function () {
      var y = window.scrollY;
      head.classList.toggle('is-stuck', y > 24);
      if (!wide.matches) head.classList.remove('is-hidden');
      else if (y > 640 && y > lastY + 2 && !head.contains(document.activeElement)) head.classList.add('is-hidden');
      if (y < lastY - 2 || y < 640) head.classList.remove('is-hidden');
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // The page is rendered by the design runtime, so wait for the sections before wiring them up.
  var t0 = performance.now();
  (function wait() {
    if (document.getElementById('faq') && document.getElementById('cakes')) return start();
    if (performance.now() - t0 < 10000) requestAnimationFrame(wait);
  })();

  function start() {
    /* "מה יש בתוך העוגה": the layers separate when the section comes into view. The visitor can put the
       cake back together, switch the base between vanilla and chocolate, and point at a layer or its label. */
    (function layers() {
      var open = false, shown = false, want = null;
      var sec = function () { return document.getElementById('layers'); };
      var apply = function () {
        var s = sec(); if (!s) return;
        s.classList.toggle('is-open', open);
        var t = document.getElementById('yl-toggle');
        if (t) { t.setAttribute('aria-pressed', open ? 'true' : 'false'); t.textContent = open ? 'להרכיב את העוגה' : 'לפרק לשכבות'; }
        var st = document.getElementById('yl-stage');
        if (st && want) st.setAttribute('data-base', want);
        $$('.yl-chip').forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-base') === (want || 'vanilla') ? 'true' : 'false'); });
      };
      var setFocus = function (n) {
        var st = document.getElementById('yl-stage'); if (!st) return;
        if (n) st.setAttribute('data-focus', n); else st.removeAttribute('data-focus');
      };
      document.addEventListener('click', function (e) {
        var t = e.target.closest && e.target.closest('#yl-toggle');
        if (t) { open = !open; apply(); return; }
        var c = e.target.closest && e.target.closest('.yl-chip');
        if (c) { want = c.getAttribute('data-base'); apply(); }
      });
      var over = function (e) { var el = e.target.closest && e.target.closest('.yl-ly, .yl-l-list li'); if (el) setFocus(el.getAttribute('data-n')); };
      var out = function (e) { var el = e.target.closest && e.target.closest('.yl-ly, .yl-l-list li'); if (el) setFocus(null); };
      document.addEventListener('mouseover', over); document.addEventListener('mouseout', out);
      document.addEventListener('focusin', function (e) { if (e.target.closest && e.target.closest('.yl-l-list li')) over(e); });
      document.addEventListener('focusout', out);
      var s0 = sec();
      if (!s0) return;
      if (reduce) { open = true; apply(); return; }
      /* The design runtime can swap the page's elements, so look the stage up fresh instead of observing one node. */
      var look = function () {
        if (shown) return;
        var st = document.getElementById('yl-stage'); if (!st) return;
        var r = st.getBoundingClientRect(), vh = window.innerHeight;
        var seen = Math.min(r.bottom, vh) - Math.max(r.top, 0);
        if (seen >= Math.min(r.height, vh) * 0.5) { shown = true; setTimeout(function () { open = true; apply(); }, 350); }
      };
      window.addEventListener('scroll', look, { passive: true });
      window.addEventListener('resize', look);
      [1000, 3000, 6000].forEach(function (ms) { setTimeout(look, ms); });
      /* the design runtime can redraw the page and drop added classes: put them back */
      new MutationObserver(function () { var s = sec(); if (s && open !== s.classList.contains('is-open')) apply(); }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
    })();

    /* Opening video: if the browser held it back (autoplay blocked, battery saver, background tab),
       start it on the next sign of life. Not when the visitor paused it, or asked for reduced motion. */
    if (!reduce) {
      var resumeHero = function () {
        var v = document.querySelector('.banner-video'), btn = document.querySelector('.vpause');
        if (!v || !v.paused || (btn && btn.getAttribute('data-paused') === 'true')) return;
        var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
      };
      ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll', 'mousemove'].forEach(function (ev) { window.addEventListener(ev, resumeHero, { passive: true }); });
      document.addEventListener('visibilitychange', function () { if (!document.hidden) resumeHero(); });
      [800, 2500, 5000].forEach(function (ms) { setTimeout(resumeHero, ms); });
    }
    /* Arriving with a #hash from another page (e.g. "להזמנת עוגה" on the gallery page): the
       sections are drawn after load, so the browser could not jump there. Do it now. */
    if (location.hash.length > 1) {
      var goTo = function () {
        var t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (!t) return;
        var y = t.getBoundingClientRect().top + window.scrollY - 84;
        window.scrollTo(0, Math.max(0, y));
      };
      // Again after the opening screen lifts, since it can hold the page at the top.
      [60, 700, 1600, 3700, 5400].forEach(function (ms) { setTimeout(goTo, ms); });
    }
    /* Underline the section in view */
    if ('IntersectionObserver' in window) {
      var links = $$('#yp-nav .yp-link');
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (a) { a.classList.toggle('is-current', a.getAttribute('href') === '#' + en.target.id); });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      ['top', 'cakes', 'workshops', 'desserts', 'about', 'faq'].forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });
    }

    /* Gallery arrows only when there is something to scroll to.
       The design runtime re-renders the galleries and drops added classes, so the rules
       go into a style element of our own, keyed by each track's id. */
    var fitCss = document.createElement('style');
    fitCss.id = 'yp-gal-fit';
    document.head.appendChild(fitCss);
    var fit = function () {
      var css = '';
      $$('.gal > .gal-track[id]').forEach(function (t) {
        if (t.clientWidth && t.scrollWidth <= t.clientWidth + 2) {
          var g = '.gal:has(> #' + t.id + ')';
          css += g + ' .gal-btn{display:none}' + g + '{padding-bottom:0}';
        }
      });
      if (fitCss.textContent !== css) fitCss.textContent = css;
    };
    var fitSoon = function () { requestAnimationFrame(function () { requestAnimationFrame(fit); }); };
    fit();
    window.addEventListener('resize', fitSoon);
    window.addEventListener('load', fitSoon);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitSoon);
    // Opening a cake-type form shows its photo gallery.
    document.addEventListener('click', fitSoon);
    [500, 1500, 3500].forEach(function (ms) { setTimeout(fit, ms); });

    /* FAQ answers and the footer's legal sections open and close smoothly */
    if (reduce) return;
    $$('#faq details, #legal details').forEach(function (d) {
      var sum = d.querySelector('summary');
      if (!sum || !d.animate) return;
      sum.addEventListener('click', function (e) {
        e.preventDefault();
        var start = d.offsetHeight;
        if (d.open) {
          var cs = getComputedStyle(d);
          var end = sum.offsetHeight + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
          var a = d.animate({ height: [start + 'px', end + 'px'] }, { duration: 450, easing: 'cubic-bezier(.2,.7,.2,1)' });
          a.onfinish = function () { d.open = false; };
        } else {
          d.open = true;
          d.animate({ height: [start + 'px', d.offsetHeight + 'px'] }, { duration: 550, easing: 'cubic-bezier(.2,.7,.2,1)' });
        }
      });
    });
  }
})();
