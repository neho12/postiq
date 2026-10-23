/* YALI CAKES — motion layer.
   Runs on top of the page the design runtime renders into #dc-root.
   Only presentation is touched: no copy, links or form logic change. */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var pre = document.querySelector('.yl-pre');

  function done() {
    doc.classList.add('fx-ready');
    if (pre && pre.parentNode) pre.parentNode.removeChild(pre);
  }

  if (reduce || !window.gsap || !window.ScrollTrigger) { done(); return; }

  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  if (window.SplitText) gsap.registerPlugin(window.SplitText);

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var PETAL = '<svg viewBox="0 0 30 30" style="width:100%;height:auto;display:block"><ellipse cx="15" cy="15" rx="6" ry="12" fill="#F4C3D1" transform="rotate(35 15 15)"></ellipse></svg>';

  // ---------------------------------------------------------------- boot
  function whenRendered(cb) {
    var t0 = performance.now();
    (function poll() {
      if ($('#cakes') && $('#top h1')) return cb();
      if (performance.now() - t0 > 8000) return done();
      requestAnimationFrame(poll);
    })();
  }

  whenRendered(function () {
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var min = new Promise(function (r) { setTimeout(r, 900); });
    var cap = new Promise(function (r) { setTimeout(r, 2600); });
    Promise.race([Promise.all([fonts, min]), cap]).then(start);
  });

  var lenis;

  function start() {
    doc.classList.add('fx');
    setupLenis();
    injectMarquees();
    injectPetals();
    var heroIntro = prepareHero();
    playPreloader(heroIntro);

    sectionCards();
    headings();
    eyebrowsAndCopy();
    typeCards();
    galleries();
    workshopsAndDesserts();
    about();
    faqAndFooter();
    revealOnShow();
    progressFallback();
    magnetic();
    cursor();

    var ro = new ResizeObserver(debounce(function () { ST.refresh(); }, 200));
    ro.observe($('#main') || document.body);
    window.addEventListener('load', function () { ST.refresh(); });
  }

  // ---------------------------------------------------------------- lenis
  function setupLenis() {
    if (!window.Lenis) return;
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.stop();

    // In-page links glide instead of jumping. The page's own hashchange
    // handler (opens the legal panels) still runs first.
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
        lenis.scrollTo(target, { offset: hash === '#top' ? 0 : -72, duration: 1.4, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
        if (target.tabIndex < 0 && !/^(A|BUTTON|INPUT|TEXTAREA|SELECT|SUMMARY)$/.test(target.tagName)) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    });
  }

  // ---------------------------------------------------------------- preloader + hero
  function prepareHero() {
    var hero = $('#top');
    var h1Lines = $$('#top h1 > span');
    var content = $('#top > div:last-of-type');
    var bits = content ? $$('p, div > a', content).filter(function (el) { return !el.closest('h1'); }) : [];
    var nav = $$('#top header > *, #top header nav > *');
    var video = $('#top .banner-video');

    gsap.set(h1Lines, { yPercent: 110, rotate: 3, clipPath: 'inset(0% 0% 100% 0%)', transformOrigin: '100% 100%' });
    gsap.set(bits, { y: 40, autoAlpha: 0 });
    gsap.set(nav, { y: -24, autoAlpha: 0 });
    if (video) gsap.set(video, { scale: 1.35 });

    var tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    if (video) tl.to(video, { scale: 1, duration: 2.4 }, 0);
    tl.to(h1Lines, { yPercent: 0, rotate: 0, clipPath: 'inset(0% 0% -20% 0%)', duration: 1.5, stagger: 0.12 }, 0.1)
      .to(bits, { y: 0, autoAlpha: 1, duration: 1.2, stagger: 0.08 }, 0.45)
      .to(nav, { y: 0, autoAlpha: 1, duration: 1, stagger: 0.04 }, 0.3);

    // Scroll: content lifts away, video pushes in, the panel rounds off.
    if (hero) {
      var st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
      if (content) gsap.to(content, { yPercent: -28, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '75% top', scrub: true } });
      if (video) gsap.to(video, { yPercent: 18, ease: 'none', scrollTrigger: st });
      gsap.fromTo(hero, { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)' },
        { clipPath: 'inset(0% 3% 0% 3% round 0px 0px 64px 64px)', ease: 'none', scrollTrigger: st });

      // Mouse depth on the headline + petals.
      if (finePointer) {
        var layers = $$('.float', hero).map(function (el, i) {
          var d = (i % 3) + 1;
          return { x: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3' }), y: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3' }), d: d * 14 };
        });
        var h1 = $('#top h1');
        var hx = gsap.quickTo(h1, 'x', { duration: 1.4, ease: 'power3' });
        var hy = gsap.quickTo(h1, 'y', { duration: 1.4, ease: 'power3' });
        hero.addEventListener('pointermove', function (e) {
          var nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
          layers.forEach(function (l) { l.x(nx * l.d * 2); l.y(ny * l.d * 2); });
          hx(nx * -12); hy(ny * -8);
        });
      }
    }
    return tl;
  }

  function playPreloader(heroIntro) {
    if (!pre) { done(); heroIntro.play(); if (lenis) lenis.start(); return; }
    var logo = $('.yl-pre__logo', pre);
    var bar = $('.yl-pre__bar i', pre);
    var layers = $$('.yl-pre__layer', pre);
    var tl = gsap.timeline({ defaults: { ease: 'expo.inOut' }, onComplete: function () { done(); ST.refresh(); } });
    tl.fromTo(logo, { autoAlpha: 0, y: 30, scale: 0.85 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.8, ease: 'expo.out' })
      .to(bar, { scaleX: 1, duration: 0.7, ease: 'power2.inOut' }, 0.15)
      .to([logo, bar.parentNode], { y: -40, autoAlpha: 0, duration: 0.6, ease: 'power3.in' }, '+=0.05')
      .to(layers[1], { clipPath: 'inset(0% 0% 100% 0%)', duration: 1 }, '-=0.15')
      .to(layers[0], { clipPath: 'inset(0% 0% 100% 0%)', duration: 1 }, '-=0.86')
      .add(function () { heroIntro.play(); if (lenis) lenis.start(); doc.classList.add('fx-ready'); }, '-=0.75');
  }

  function injectPetals() {
    var hero = $('#top');
    if (!hero) return;
    var spots = [[12, 30, 22], [40, 18, 18], [58, 72, 28], [86, 58, 20], [70, 8, 16], [30, 80, 24]];
    spots.forEach(function (s, i) {
      var p = document.createElement('span');
      p.className = 'float yl-petal' + (i > 3 ? ' hide-sm' : '');
      p.setAttribute('aria-hidden', 'true');
      p.style.cssText = 'left:' + s[0] + '%;top:' + s[1] + '%;width:' + s[2] + 'px;opacity:.85';
      p.innerHTML = PETAL;
      hero.insertBefore(p, hero.querySelector('header'));
    });
    $$('.float', hero).forEach(function (el, i) {
      var inner = el.firstElementChild;
      gsap.to(inner, { y: gsap.utils.random(-22, -10), rotate: gsap.utils.random(-30, 30), duration: gsap.utils.random(3, 5.5), ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.3 });
      gsap.to(el, { yPercent: -((i % 3) + 1) * 220, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    });
  }

  // ---------------------------------------------------------------- marquee
  function marquee(words, alt) {
    var wrap = document.createElement('div');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.cssText = alt ? 'overflow-x:clip;padding:56px 0;position:relative;z-index:3' : 'position:relative;z-index:3';
    var bar = document.createElement('div');
    bar.className = 'yl-marquee' + (alt ? ' yl-marquee--alt' : '');
    bar.dir = 'ltr';
    var row = document.createElement('div');
    row.className = 'yl-marquee__row';
    var html = '';
    var petal = '<svg viewBox="0 0 30 30"><ellipse cx="15" cy="15" rx="6" ry="12" fill="' + (alt ? '#694B3A' : '#F4C3D1') + '" transform="rotate(35 15 15)"></ellipse></svg>';
    words.forEach(function (w) { html += '<span>' + w + '</span>' + petal; });
    for (var i = 0; i < 4; i++) {
      var set = document.createElement('div');
      set.className = 'yl-marquee__set';
      set.innerHTML = html;
      row.appendChild(set);
    }
    bar.appendChild(row);
    wrap.appendChild(bar);

    var x = 0, dir = alt ? 1 : -1, boost = 0;
    gsap.ticker.add(function (t, dt) {
      var w = row.firstElementChild.offsetWidth;
      if (!w) return;
      var v = lenis ? lenis.velocity : 0;
      if (Math.abs(v) > 0.2) dir = (v > 0 ? -1 : 1) * (alt ? -1 : 1);
      boost += (Math.min(Math.abs(v) * 0.9, 14) - boost) * 0.08;
      x += dir * (0.9 + boost) * (dt / 16.67);
      if (x <= -w) x += w;
      if (x > 0) x -= w;
      row.style.transform = 'translate3d(' + x + 'px,0,0)';
    });
    return wrap;
  }

  function injectMarquees() {
    var cakes = $('#cakes'), about = $('#about');
    if (cakes) cakes.parentNode.insertBefore(marquee(['עוגות מעוצבות', 'סדנאות אפייה', 'YALI CAKES', 'שולחנות קינוחים'], false), cakes);
    if (about) about.parentNode.insertBefore(marquee(['עוגות מעוצבות', 'סדנאות אפייה', 'YALI CAKES', 'שולחנות קינוחים'], true), about);
  }

  // ---------------------------------------------------------------- sections
  function sectionCards() {
    $$('#cakes, #workshops, #desserts, #about, #faq').forEach(function (sec) {
      gsap.fromTo(sec,
        { clipPath: 'inset(0% 4% 0% 4% round 72px 72px 0px 0px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', ease: 'none',
          scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top 20%', scrub: true } });
    });
  }

  function headings() {
    var targets = $$('main h2, footer .legal h2');
    if (!window.SplitText) {
      targets.forEach(function (h) {
        gsap.from(h, { y: 60, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%' } });
      });
      return;
    }
    targets.forEach(function (h) {
      window.SplitText.create(h, {
        type: 'lines', mask: 'lines', linesClass: 'yl-line', autoSplit: true,
        onSplit: function (self) {
          self.masks.forEach(function (m) { m.classList.add('yl-line-mask'); });
          return gsap.from(self.lines, {
            yPercent: 115, rotate: 4, transformOrigin: '100% 0%', duration: 1.3, ease: 'expo.out', stagger: 0.1,
            scrollTrigger: { trigger: h, start: 'top 88%', once: true }
          });
        }
      });
    });
  }

  function eyebrowsAndCopy() {
    $$('main h2').forEach(function (h) {
      var box = h.parentNode;
      var sibs = Array.prototype.slice.call(box.children).filter(function (el) { return el !== h; });
      var eyebrow = sibs.filter(function (el) { return el.tagName === 'P' && /letter-spacing/.test(el.getAttribute('style') || ''); });
      var rest = sibs.filter(function (el) { return eyebrow.indexOf(el) < 0 && el.tagName !== 'BUTTON' && !el.matches('details'); });
      var btns = sibs.filter(function (el) { return el.tagName === 'BUTTON'; });
      if (eyebrow.length) gsap.from(eyebrow, { letterSpacing: '0.5em', autoAlpha: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: box, start: 'top 88%', once: true } });
      if (rest.length) gsap.from(rest, { y: 36, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, delay: 0.25, scrollTrigger: { trigger: box, start: 'top 85%', once: true } });
      if (btns.length) gsap.from(btns, { scale: 0.6, autoAlpha: 0, duration: 1.2, ease: 'elastic.out(1,0.6)', delay: 0.5, scrollTrigger: { trigger: box, start: 'top 85%', once: true } });
    });
  }

  // ---------------------------------------------------------------- cakes
  function typeCards() {
    var cards = $$('.typecard');
    if (!cards.length) return;
    gsap.from(cards, {
      y: 140, rotateX: -35, rotateZ: function (i) { return (i % 2 ? 1 : -1) * 4; }, autoAlpha: 0,
      transformOrigin: '50% 100%', duration: 1.4, ease: 'expo.out', stagger: 0.09,
      scrollTrigger: { trigger: '#tgal', start: 'top 88%', once: true },
      onComplete: function () { if (finePointer) cards.forEach(tilt); }
    });
    var hint = $('#orderHint');
    if (hint) gsap.from(hint, { autoAlpha: 0, y: 20, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: hint, start: 'top 92%', once: true } });
  }

  function tilt(card) {
    var rx = gsap.quickTo(card, 'rotateX', { duration: 0.6, ease: 'power3' });
    var ry = gsap.quickTo(card, 'rotateY', { duration: 0.6, ease: 'power3' });
    var ty = gsap.quickTo(card, 'y', { duration: 0.6, ease: 'power3' });
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      rx(py * -10); ry(px * 12); ty(-8);
    });
    card.addEventListener('pointerleave', function () { rx(0); ry(0); ty(0); });
  }

  // ---------------------------------------------------------------- galleries
  function galleries() {
    var main = ['#gal', '#wgal', '#dgal'].map(function (s) { return $(s); }).filter(Boolean);
    main.forEach(function (track) {
      var slides = $$('.gal-slide', track);
      gsap.from(slides, {
        xPercent: -40, y: 80, rotate: -6, autoAlpha: 0, duration: 1.5, ease: 'expo.out', stagger: 0.07,
        scrollTrigger: { trigger: track, start: 'top 85%', once: true }
      });
      // Images drift inside their frames as the page moves.
      gsap.fromTo($$('img', track), { yPercent: -5 }, {
        yPercent: 5, ease: 'none',
        scrollTrigger: { trigger: track, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // Velocity skew — the strip leans into the scroll.
    if (lenis && main.length) {
      var setters = main.map(function (t) { return gsap.quickTo(t, 'skewY', { duration: 0.5, ease: 'power3' }); });
      lenis.on('scroll', function (l) {
        var s = gsap.utils.clamp(-4, 4, l.velocity * -0.18);
        setters.forEach(function (fn) { fn(s); });
      });
    }

    // Arrow buttons pop in.
    $$('.gal-btn').forEach(function (b) {
      gsap.from(b, { scale: 0, duration: 0.9, ease: 'back.out(2)', scrollTrigger: { trigger: b.parentNode, start: 'top 80%', once: true } });
    });
  }

  // ---------------------------------------------------------------- workshops & desserts
  function workshopsAndDesserts() {
    $$('.ws-media').forEach(function (m) {
      gsap.fromTo(m, { yPercent: 10 }, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: m, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    $$('#workshops ul').forEach(function (ul) {
      var items = $$(':scope > li', ul);
      var paths = $$('svg path', ul);
      paths.forEach(function (p) {
        var len = p.getTotalLength ? p.getTotalLength() : 30;
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      });
      var tl = gsap.timeline({ scrollTrigger: { trigger: ul, start: 'top 85%', once: true } });
      tl.from(items, { x: 50, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.12 })
        .to(paths, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out', stagger: 0.12 }, 0.25);
    });

    $$('#workshops [style*="grid-template-columns"] > div').forEach(function (el, i) {
      gsap.from(el, { y: 60, autoAlpha: 0, duration: 1.2, ease: 'expo.out', delay: (i % 4) * 0.08, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    $$('#desserts svg[role="img"]').forEach(function (el) {
      gsap.from(el, { scale: 0.6, rotate: -14, autoAlpha: 0, duration: 1.4, ease: 'elastic.out(1,0.55)', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
  }

  // ---------------------------------------------------------------- about
  function about() {
    var frame = $('.about-photo > div');
    var img = frame && $('img', frame);
    if (frame) {
      gsap.fromTo(frame, { clipPath: 'inset(22% 22% 22% 22% round 200px)', rotate: -4 },
        { clipPath: 'inset(0% 0% 0% 0% round 40px)', rotate: 0, ease: 'none',
          scrollTrigger: { trigger: frame, start: 'top 95%', end: 'center 55%', scrub: true } });
    }
    if (img) {
      gsap.fromTo(img, { scale: 1.5 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true } });
    }

    var q = $('#about blockquote');
    if (q && window.SplitText) {
      var split = window.SplitText.create(q, { type: 'words', wordsClass: 'yl-quote-word' });
      gsap.fromTo(split.words, { opacity: 0.12 }, {
        opacity: 1, ease: 'none', stagger: 0.1,
        scrollTrigger: { trigger: q, start: 'top 85%', end: 'bottom 50%', scrub: true }
      });
    }

    var ps = $$('#about p').filter(function (p) { return !p.closest('blockquote'); });
    ps.forEach(function (p) {
      gsap.from(p, { y: 30, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: p, start: 'top 90%', once: true } });
    });
  }

  // ---------------------------------------------------------------- faq & footer
  function faqAndFooter() {
    var items = $$('.faq details');
    if (items.length) {
      gsap.from(items, { y: 50, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: items[0], start: 'top 90%', once: true } });
    }
    $$('.faq details, .legal details').forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (!d.open) return;
        var kids = Array.prototype.slice.call(d.children).filter(function (el) { return el.tagName !== 'SUMMARY'; });
        gsap.fromTo(kids, { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: 'expo.out', stagger: 0.03, clearProps: 'transform,opacity,visibility' });
        ST.refresh();
      });
    });

    var legal = $$('footer .legal > *');
    if (legal.length) gsap.from(legal, { y: 40, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: 'footer', start: 'top 90%', once: true } });
  }

  // ---------------------------------------------------------------- panels that open (forms, quotes)
  function revealOnShow() {
    var root = $('#main');
    if (!root) return;
    var hidden = /display:\s*none/;
    var queue = new Set(), raf = 0;
    var mo = new MutationObserver(function (list) {
      list.forEach(function (m) {
        var el = m.target;
        if (el.nodeType !== 1 || !hidden.test(m.oldValue || '') || hidden.test(el.getAttribute('style') || '')) return;
        queue.add(el);
      });
      if (queue.size && !raf) raf = requestAnimationFrame(flush);
    });
    function flush() {
      raf = 0;
      queue.forEach(function (el) {
        if (el.offsetParent === null) return;
        var big = el.id === 'order-panel' || el.id === 'quote' || el.id === 'dessert-quote';
        if (big) {
          gsap.fromTo(el, { clipPath: 'inset(0% 0% 100% 0% round 32px)', y: 30 }, { clipPath: 'inset(0% 0% 0% 0% round 32px)', y: 0, duration: 1.1, ease: 'expo.out', clearProps: 'clipPath,transform' });
        }
        var kids = Array.prototype.slice.call(el.children);
        gsap.fromTo(kids, { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: 'expo.out', stagger: 0.05, delay: big ? 0.15 : 0, clearProps: 'transform,opacity,visibility' });
      });
      queue.clear();
      ST.refresh();
    }
    mo.observe(root, { subtree: true, attributes: true, attributeFilter: ['style'], attributeOldValue: true });
  }

  // ---------------------------------------------------------------- misc
  function progressFallback() {
    if (window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()')) return;
    var bar = $('.progress');
    if (bar) gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
  }

  function magnetic() {
    if (!finePointer) return;
    $$('.cta, .btn-soft, .soc').forEach(function (el) {
      var mx = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1,0.4)' });
      var my = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1,0.4)' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * 0.25);
        my((e.clientY - (r.top + r.height / 2)) * 0.35);
      });
      el.addEventListener('pointerleave', function () { mx(0); my(0); });
    });
  }

  function cursor() {
    if (!finePointer) return;
    var ring = document.createElement('div'), dot = document.createElement('div');
    ring.className = 'yl-cursor'; dot.className = 'yl-cursor-dot';
    ring.setAttribute('aria-hidden', 'true'); dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring); document.body.appendChild(dot);
    var rx = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' });
    var ry = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });
    var dx = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'none' });
    var dy = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'none' });
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      doc.classList.add('has-cursor');
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
    }, { passive: true });
    document.addEventListener('pointerleave', function () { doc.classList.remove('has-cursor'); });
    window.addEventListener('pointerdown', function () { ring.classList.add('is-down'); });
    window.addEventListener('pointerup', function () { ring.classList.remove('is-down'); });
    document.addEventListener('pointerover', function (e) {
      var t = e.target;
      ring.classList.remove('is-link', 'is-media', 'is-text');
      dot.classList.remove('is-hidden');
      if (t.closest('input, textarea, select')) { ring.classList.add('is-text'); dot.classList.add('is-hidden'); }
      else if (t.closest('.gal-slide, .about-photo')) { ring.classList.add('is-media'); dot.classList.add('is-hidden'); }
      else if (t.closest('a, button, summary, label, .typecard')) { ring.classList.add('is-link'); dot.classList.add('is-hidden'); }
    });
  }

  function debounce(fn, ms) {
    var t;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }
})();
