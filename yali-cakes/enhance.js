/* YALI CAKES: quiet motion layer.
   Smooth scrolling, soft fade-ups. Presentation only: no copy, links or form logic change. */
(function () {
  'use strict';
  var doc = document.documentElement;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Opening screen: logo and progress line, then two colour layers lift away.
  (function opening() {
    var pre = document.querySelector('.yl-pre');
    if (!pre) return;
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var min = new Promise(function (r) { setTimeout(r, 3000); });
    var cap = new Promise(function (r) { setTimeout(r, 5000); });
    requestAnimationFrame(function () { requestAnimationFrame(function () { pre.classList.add('in'); }); });
    Promise.race([Promise.all([fonts, min]), cap]).then(function () {
      if (!location.hash) window.scrollTo(0, 0);
      pre.classList.add('out');
      setTimeout(function () { doc.classList.add('fx-ready'); }, 300);
      setTimeout(function () { if (pre.parentNode) pre.parentNode.removeChild(pre); }, 1400);
    });
  })();

  (function boot() {
    var t0 = performance.now();
    (function poll() {
      if (document.getElementById('cakes') && document.querySelector('#top h1')) return start();
      if (performance.now() - t0 < 8000) requestAnimationFrame(poll);
    })();
  })();

  function start() {
    doc.classList.add('fx');
    smoothScroll();
    reveal();
  }

  function smoothScroll() {
    if (!window.Lenis) return;
    var lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());

    // In-page links glide. The page's own hashchange handler (legal panels) still runs.
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
        lenis.scrollTo(target, { offset: hash === '#top' ? 0 : -72, duration: 1.1 });
        if (!/^(A|BUTTON|INPUT|TEXTAREA|SELECT|SUMMARY)$/.test(target.tagName) && target.tabIndex < 0) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    });
  }

  function reveal() {
    if (!('IntersectionObserver' in window)) return;
    var blocks = $$('main h2').map(function (h) { return h.parentElement; });
    blocks = blocks.concat($$('main .gal, main .about-photo, main .ws-media'));
    blocks = blocks.filter(function (el, i) {
      return !el.closest('#order-panel') && blocks.indexOf(el) === i &&
        !blocks.some(function (o) { return o !== el && o.contains(el); });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    blocks.forEach(function (el) { el.classList.add('rv'); io.observe(el); });
  }
})();
