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
    layerCake();
    sprinkles();
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

    frostingPath();

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

    gsap.set(h1Lines, { yPercent: 110, rotate: 3, clipPath: 'inset(0% 0% 100% 0%)', transformOrigin: '100% 100%' });
    gsap.set(bits, { y: 40, autoAlpha: 0 });
    gsap.set(nav, { y: -24, autoAlpha: 0 });

    var tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    tl.to(h1Lines, { yPercent: 0, rotate: 0, clipPath: 'inset(0% 0% -20% 0%)', duration: 1.5, stagger: 0.12 }, 0.1)
      .to(bits, { y: 0, autoAlpha: 1, duration: 1.2, stagger: 0.08 }, 0.45)
      .to(nav, { y: 0, autoAlpha: 1, duration: 1, stagger: 0.04 }, 0.3);

    // Scroll: content lifts away and the dome rises (the video itself stays still).
    if (hero) {
      var st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
      if (content) gsap.to(content, { yPercent: -28, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '75% top', scrub: true } });
      heroDome(hero, h1Lines);

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

  // A small arch waits at the foot of the hero, then swells into a full
  // cocoa dome that hands over to the marquee band below.
  function heroDome(hero, lines) {
    var dome = document.createElement('div');
    dome.className = 'yl-dome';
    dome.setAttribute('aria-hidden', 'true');
    hero.appendChild(dome);
    var g = {};
    var measure = function () {
      g.W = hero.clientWidth; g.H = hero.clientHeight;
      g.w = g.W < 720 ? 34 : 64; g.h = g.W < 720 ? 52 : 100;
    };
    measure();
    var from = function () { return 'inset(calc(100% - ' + g.h + 'px) calc(50% - ' + g.w / 2 + 'px) 0px calc(50% - ' + g.w / 2 + 'px) round ' + g.w / 2 + 'px ' + g.w / 2 + 'px 0px 0px / ' + g.w / 2 + 'px ' + g.w / 2 + 'px 0px 0px)'; };
    // Same shape of string as `from`, so GSAP can tween number by number.
    var to = function () { return 'inset(calc(0% - 0px) calc(0% - 0px) 0px calc(0% - 0px) round ' + g.W / 2 + 'px ' + g.W / 2 + 'px 0px 0px / ' + g.H + 'px ' + g.H + 'px 0px 0px)'; };
    gsap.set(dome, { clipPath: from() });
    gsap.timeline({ scrollTrigger: { trigger: hero, start: 'bottom bottom', end: 'bottom 25%', scrub: true, invalidateOnRefresh: true, onRefreshInit: measure } })
      .fromTo(dome, { clipPath: from }, { clipPath: to, ease: 'power1.in' }, 0)
      .fromTo(lines[0] || {}, { xPercent: 0, scale: 1 }, { xPercent: 14, scale: 0.86, ease: 'power1.in' }, 0)
      .fromTo(lines[1] || {}, { xPercent: 0, scale: 1 }, { xPercent: -14, scale: 0.86, ease: 'power1.in' }, 0);
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


  // ---------------------------------------------------------------- layer cake
  // A pinned, scroll-driven build: plate, sponge, cream, sponge, cream,
  // sponge, frosting, topping, candle. Illustration only, no copy.
  function layerCake() {
    var cakes = $('#cakes');
    if (!cakes) return;
    var sec = document.createElement('section');
    sec.id = 'build';
    sec.className = 'yl-build';
    sec.setAttribute('aria-hidden', 'true');
    sec.innerHTML =
      '<div class="yl-build__halo"></div>' +
      '<svg class="yl-build__svg" viewBox="0 0 400 470" role="presentation" focusable="false">' +
        '<ellipse class="b-shadow" cx="200" cy="428" rx="150" ry="13" fill="#F4C3D1"/>' +
        '<g class="b-plate"><ellipse cx="200" cy="410" rx="150" ry="22" fill="#FFFFFF" stroke="#E3A9BB" stroke-width="3"/><ellipse cx="200" cy="406" rx="116" ry="13" fill="#FAE4EA"/></g>' +
        '<g class="b-layer"><rect x="70" y="344" width="260" height="56" rx="12" fill="#694B3A"/></g>' +
        '<g class="b-layer"><rect x="62" y="332" width="276" height="18" rx="9" fill="#FFFFFF"/></g>' +
        '<g class="b-layer"><rect x="70" y="284" width="260" height="52" rx="12" fill="#A08373"/></g>' +
        '<g class="b-layer"><rect x="62" y="272" width="276" height="18" rx="9" fill="#FFFFFF"/></g>' +
        '<g class="b-layer"><rect x="70" y="224" width="260" height="54" rx="12" fill="#694B3A"/></g>' +
        '<g class="b-frost"><rect x="58" y="204" width="284" height="36" rx="18" fill="#F4C3D1"/>' +
          '<rect x="84" y="226" width="22" height="46" rx="11" fill="#F4C3D1"/><rect x="132" y="226" width="22" height="30" rx="11" fill="#F4C3D1"/>' +
          '<rect x="196" y="226" width="22" height="54" rx="11" fill="#F4C3D1"/><rect x="250" y="226" width="22" height="34" rx="11" fill="#F4C3D1"/>' +
          '<rect x="296" y="226" width="22" height="44" rx="11" fill="#F4C3D1"/></g>' +
        '<g class="b-top"><circle cx="110" cy="196" r="13" fill="#694B3A"/><circle cx="150" cy="190" r="9" fill="#FFFFFF"/><circle cx="250" cy="190" r="9" fill="#FFFFFF"/><circle cx="290" cy="196" r="13" fill="#694B3A"/><circle cx="130" cy="180" r="6" fill="#E3A9BB"/><circle cx="270" cy="180" r="6" fill="#E3A9BB"/></g>' +
        '<g class="b-candle"><rect x="193" y="142" width="14" height="58" rx="5" fill="#FFFFFF"/><path d="M193 156l14 8M193 172l14 8M193 188l14 8" stroke="#E3A9BB" stroke-width="4" stroke-linecap="round"/>' +
          '<g class="b-flame-wrap"><path class="b-flame" d="M200 111c9 11 12 19 6 27-3 4-9 4-12 0-6-8-3-16 6-27z" fill="#F5B94A"/></g></g>' +
        '<g class="b-dots"><circle cx="52" cy="150" r="5" fill="#E3A9BB"/><circle cx="348" cy="130" r="6" fill="#694B3A"/><circle cx="332" cy="86" r="4" fill="#F4C3D1"/><circle cx="70" cy="96" r="6" fill="#F4C3D1"/><circle cx="360" cy="200" r="4" fill="#A08373"/><circle cx="38" cy="214" r="4" fill="#694B3A"/></g>' +
      '</svg>';
    cakes.parentNode.insertBefore(sec, cakes.nextSibling);

    var q = function (c) { return $$(c, sec); };
    var layers = q('.b-layer');
    var tl = gsap.timeline({
      defaults: { ease: 'power2.out' },
      scrollTrigger: { trigger: sec, start: 'top top', end: function () { return '+=' + Math.round(innerHeight * (innerWidth < 700 ? 1.8 : 2.4)); }, pin: true, scrub: 0.6, invalidateOnRefresh: true }
    });
    tl.from(q('.b-shadow'), { scaleX: 0.3, opacity: 0, transformOrigin: '50% 50%', duration: 1 }, 0)
      .from(q('.b-plate'), { y: 90, opacity: 0, duration: 1 }, 0)
      .from(q('.yl-build__halo'), { scale: 0.4, opacity: 0, duration: 7 }, 0);
    layers.forEach(function (el, i) {
      tl.from(el, { y: -320, opacity: 0, duration: 1.1, ease: 'power3.out' }, 1 + i * 1.05);
      tl.from(el, { scaleY: 1.12, transformOrigin: '50% 100%', duration: 0.35, ease: 'power2.in' }, 1 + i * 1.05 + 0.75);
    });
    tl.from(q('.b-frost'), { y: -320, opacity: 0, duration: 1.1, ease: 'power3.out' }, 6.3)
      .from(q('.b-frost rect:not(:first-child)'), { scaleY: 0, transformOrigin: '50% 0%', duration: 0.9, stagger: 0.08 }, 7.1)
      .from(q('.b-top circle'), { scale: 0, y: -40, transformOrigin: '50% 50%', duration: 0.7, stagger: 0.07, ease: 'back.out(2.4)' }, 7.4)
      .from(q('.b-candle rect, .b-candle path:not(.b-flame)'), { y: -120, opacity: 0, duration: 0.9, ease: 'power3.out' }, 8)
      .from(q('.b-flame-wrap'), { scale: 0, transformOrigin: '50% 100%', duration: 0.6, ease: 'back.out(3)' }, 8.8)
      .from(q('.b-dots circle'), { scale: 0, transformOrigin: '50% 50%', duration: 0.6, stagger: 0.06, ease: 'back.out(3)' }, 8.9)
      .to(q('.yl-build__svg'), { scale: 1.06, transformOrigin: '50% 60%', duration: 1.2, ease: 'sine.inOut' }, 9);
    gsap.to(q('.b-flame'), { scaleY: 1.14, scaleX: 0.92, transformOrigin: '50% 100%', duration: 0.35, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }

  // ---------------------------------------------------------------- sprinkles (parallax)
  function sprinkles() {
    var colors = ['#E3A9BB', '#F4C3D1', '#694B3A', '#A08373', '#FFFFFF', '#9DB89A'];
    var shapes = [
      function (c) { return '<svg viewBox="0 0 30 12"><rect x="1" y="1" width="28" height="10" rx="5" fill="' + c + '"/></svg>'; },
      function (c) { return '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="' + c + '"/></svg>'; },
      function (c) { return '<svg viewBox="0 0 24 22"><path d="M12 2l10 18H2z" fill="' + c + '" stroke="' + c + '" stroke-width="3" stroke-linejoin="round"/></svg>'; },
      function (c) { return '<svg viewBox="0 0 30 20"><ellipse cx="15" cy="10" rx="12" ry="7.5" fill="' + c + '"/><path d="M5 10c6-3 14-3 20 0" stroke="#FFF9FA" stroke-opacity=".55" stroke-width="2" fill="none"/></svg>'; },
      function (c) { return '<svg viewBox="0 0 30 24"><path d="M3 21C3 9 12 3 27 3c0 12-8 18-24 18z" fill="' + c + '"/><path d="M5 19C12 13 18 9 24 6" stroke="#FFF9FA" stroke-opacity=".5" stroke-width="1.6" fill="none"/></svg>'; }
    ];
    var seed = 7;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    ['#workshops', '#desserts', '#about'].forEach(function (id) {
      var sec = $(id);
      if (!sec) return;
      var wrap = document.createElement('div');
      wrap.className = 'yl-sprinkles';
      wrap.setAttribute('aria-hidden', 'true');
      var items = [];
      for (var i = 0; i < 16; i++) {
        var side = i % 2 ? 1 : 0;
        var depth = [0.35, 0.7, 1.1][i % 3];
        var el = document.createElement('i');
        var c = i % 5 === 4 ? '#9DB89A' : colors[Math.floor(rnd() * 5)];
        var shape = c === '#9DB89A' ? shapes[4] : shapes[Math.floor(rnd() * 4)];
        el.innerHTML = shape(c);
        var size = 16 + depth * 14 + rnd() * 6;
        var x = side ? -1.3 + rnd() * 1.5 : 98.3 + rnd() * 1.5; // peek in from the edges, clear of the text
        el.style.cssText = 'top:' + (3 + (i / 16) * 94 + rnd() * 4) + '%;' + (side ? 'left:' : 'left:') + x + '%;width:' + size + 'px;rotate:' + Math.round(rnd() * 360) + 'deg;' + (depth > 1 ? 'filter:blur(1.2px);' : '');
        wrap.appendChild(el);
        items.push([el, depth]);
      }
      sec.insertBefore(wrap, sec.firstChild);
      items.forEach(function (it) {
        gsap.fromTo(it[0], { y: 140 * it[1] }, { y: -140 * it[1], rotate: '+=' + (it[1] * 70), ease: 'none',
          scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    });
  }

  // ---------------------------------------------------------------- piped line down the page
  function frostingPath() {
    var main = $('#main'), first = $('#cakes');
    if (!main || !first || window.matchMedia('(max-width: 700px)').matches) return;
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'yl-pipe');
    svg.setAttribute('aria-hidden', 'true');
    var outline = document.createElementNS(NS, 'path');
    var fill = document.createElementNS(NS, 'path');
    [outline, fill].forEach(function (p, i) {
      p.setAttribute('pathLength', '1');
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', i ? '#F4C3D1' : '#E3A9BB');
      p.setAttribute('stroke-width', i ? '8' : '13');
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-linejoin', 'round');
      p.style.strokeDasharray = '1';
      p.style.strokeDashoffset = '1.002';
      svg.appendChild(p);
    });
    main.appendChild(svg);

    function top(el) {
      var y = 0;
      while (el && el !== main) { y += el.offsetTop; el = el.offsetParent; }
      return y;
    }
    function layout() {
      var W = main.offsetWidth, y0 = top(first) + 60, H = main.offsetHeight - y0;
      if (H < 400) return;
      var m = Math.max(16, W * 0.011);
      var tops = ['#workshops', '#desserts', '#about', '#faq'].map(function (id) { var e = $(id); return e ? top(e) - y0 : null; }).filter(function (v) { return v !== null; });
      var R = W - m, L = m, x = R, y = 0, d = 'M ' + R + ' 0';
      var wave = function (toY, xx) {
        // gentle bead-like wobble while running straight down the margin
        var n = Math.max(1, Math.round((toY - y) / 260)), step = (toY - y) / n;
        for (var k = 0; k < n; k++) {
          var amp = (k % 2 ? -1 : 1) * 7 * (xx === R ? -1 : 1);
          d += ' C ' + (xx + amp) + ' ' + (y + step * 0.35) + ', ' + (xx - amp) + ' ' + (y + step * 0.65) + ', ' + xx + ' ' + (y + step);
          y += step;
        }
      };
      tops.forEach(function (t, i) {
        var nx = i % 2 ? R : L, cy = t - 130;
        wave(cy, x);
        d += ' C ' + x + ' ' + (cy + 70) + ', ' + nx + ' ' + (cy + 40) + ', ' + nx + ' ' + (cy + 130);
        y = cy + 130; x = nx;
      });
      wave(H - 40, x);
      svg.style.top = y0 + 'px';
      svg.setAttribute('width', W); svg.setAttribute('height', H);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      outline.setAttribute('d', d); fill.setAttribute('d', d);
    }
    layout();
    ST.addEventListener('refresh', layout);
    var state = { p: 0 };
    gsap.to(state, {
      p: 1, ease: 'none',
      scrollTrigger: { trigger: svg, start: 'top 75%', end: 'bottom 70%', scrub: 0.5 },
      onUpdate: function () {
        var off = state.p <= 0.001 ? 1.002 : 1 - state.p;
        outline.style.strokeDashoffset = off; fill.style.strokeDashoffset = off;
      }
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
        { clipPath: 'inset(0% 6% 0% 6% round 50% 50% 0px 0px / 160px 160px 0px 0px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 0% 0% 0px 0px / 0px 0px 0px 0px)', ease: 'none',
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
      gsap.from(slides.slice(0, 6), {
        y: 90, autoAlpha: 0, duration: 1.4, ease: 'expo.out', stagger: 0.07,
        scrollTrigger: { trigger: track, start: 'top 85%', once: true }
      });
      // Images drift inside their frames as the page moves.
      gsap.fromTo($$('img', track), { yPercent: -5 }, {
        yPercent: 5, ease: 'none',
        scrollTrigger: { trigger: track, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    var pinned = pinGallery();

    // Velocity skew — the strip leans into the scroll.
    var leaners = main.filter(function (t) { return t !== pinned; });
    if (lenis && leaners.length) {
      var setters = leaners.map(function (t) { return gsap.quickTo(t, 'skewY', { duration: 0.5, ease: 'power3' }); });
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

  // Desktop: the works strip holds in place and slides sideways while the
  // page scrolls, then lets go. Arrows and swiping keep working.
  function pinGallery() {
    var track = $('#gal');
    if (!track || !window.matchMedia('(min-width: 900px)').matches) return null;
    var gal = track.closest('.gal');
    // Modern engines count RTL scrollLeft from 0 down to negative values.
    var sign = getComputedStyle(track).direction === 'rtl' ? -1 : 1;
    var dist = 0;
    var measure = function () { dist = Math.max(0, Math.min(track.scrollWidth - track.clientWidth, innerHeight * 3)); };
    measure();
    if (dist < 200) return null;
    doc.classList.add('yl-gal-pinned');
    ST.create({
      trigger: gal, start: 'center center', end: function () { return '+=' + dist; },
      pin: true, pinSpacing: true, scrub: true, invalidateOnRefresh: true, onRefreshInit: measure,
      onUpdate: function (self) { track.scrollLeft = sign * self.progress * dist; }
    });
    return track;
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
      var w = function () { return frame.offsetWidth; };
      gsap.fromTo(frame,
        { clipPath: function () { return 'inset(38% 26% 0% 26% round ' + w() * 0.24 + 'px ' + w() * 0.24 + 'px 24px 24px)'; } },
        { clipPath: function () { return 'inset(0% 0% 0% 0% round ' + w() / 2 + 'px ' + w() / 2 + 'px 40px 40px)'; }, ease: 'none',
          scrollTrigger: { trigger: frame, start: 'top 95%', end: 'center 55%', scrub: true, invalidateOnRefresh: true } });
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
