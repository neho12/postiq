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

    /* Workshop film: plays silently while in view, pauses when it leaves; the button turns sound on and off.
       With reduced motion it waits for a tap. Listeners are delegated because the runtime can re-render. */
    var film = function () { return document.querySelector('.yp-film-video'); };
    var soundBtn = function () { return document.querySelector('.yp-film-sound'); };
    var setSound = function (on) {
      var v = film(), b = soundBtn();
      if (!v || !b) return;
      v.muted = !on;
      b.setAttribute('data-muted', on ? 'false' : 'true');
      var l = on ? 'השתקת סאונד' : 'הפעלת סאונד';
      b.setAttribute('aria-label', l); b.title = l;
    };
    var play = function (v) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); };
    document.addEventListener('click', function (e) {
      var v = film();
      if (!v) return;
      if (e.target.closest('.yp-film-sound')) {
        var on = v.muted;
        setSound(on);
        if (on && v.paused) play(v);
      } else if (e.target === v) {
        if (v.paused) play(v); else v.pause();
      }
    });
    // Checked on scroll against whatever video element is current, since the runtime may replace it.
    if (!reduce) {
      var userPaused = false;
      // A tap on a playing video pauses it; remember that so scrolling doesn't restart it until it leaves view.
      document.addEventListener('click', function (e) { var v = film(); if (v && e.target === v) userPaused = !v.paused; }, true);
      var tick = function () {
        var v = film();
        if (!v) return;
        var r = v.getBoundingClientRect(), vh = window.innerHeight;
        if (r.top < vh + 600 && r.bottom > -600 && v.preload !== 'auto') v.preload = 'auto';
        var shown = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / (r.height || 1);
        if (shown >= 0.4) {
          if (v.paused && !userPaused) { var b = soundBtn(); v.muted = !b || b.getAttribute('data-muted') !== 'false'; play(v); }
        }
        else { if (!v.paused) v.pause(); userPaused = false; }
      };
      var queued = false;
      window.addEventListener('scroll', function () { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; tick(); }); }, { passive: true });
      window.addEventListener('resize', tick);
      tick();
    }

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
