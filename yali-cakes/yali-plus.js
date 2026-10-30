/* YALI CAKES: behaviour for the additions (top menu, smooth FAQ answers). */
(function () {
  'use strict';
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Top menu: a floating capsule after scrolling, hides on the way down ---------- */
  var head = document.getElementById('yp-head');
  var menu = document.getElementById('yp-menu');
  var nav = document.getElementById('yp-nav');
  if (head) {
    var lastY = window.scrollY;
    var onScroll = function () {
      var y = window.scrollY;
      head.classList.toggle('is-stuck', y > 24);
      if (!doc.classList.contains('yp-menu-open') && y > 640 && y > lastY + 2 && !head.contains(document.activeElement)) head.classList.add('is-hidden');
      if (y < lastY - 2 || y < 640) head.classList.remove('is-hidden');
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var setMenu = function (open) {
      menu.setAttribute('aria-expanded', open ? 'true' : 'false');
      nav.classList.toggle('is-open', open);
      doc.classList.toggle('yp-menu-open', open);
    };
    menu.addEventListener('click', function () { setMenu(menu.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menu.focus(); }
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
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

    /* FAQ answers open and close smoothly */
    if (reduce) return;
    $$('#faq details').forEach(function (d) {
      var sum = d.querySelector('summary');
      if (!sum || !d.animate) return;
      sum.addEventListener('click', function (e) {
        e.preventDefault();
        var start = d.offsetHeight;
        if (d.open) {
          var a = d.animate({ height: [start + 'px', sum.offsetHeight + 'px'] }, { duration: 450, easing: 'cubic-bezier(.2,.7,.2,1)' });
          a.onfinish = function () { d.open = false; };
        } else {
          d.open = true;
          d.animate({ height: [start + 'px', d.offsetHeight + 'px'] }, { duration: 550, easing: 'cubic-bezier(.2,.7,.2,1)' });
        }
      });
    });
  }
})();
