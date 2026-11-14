/* YALI CAKES gallery page: renders data/gallery.json with category filters and a lightbox.
   New photos are added by appending to data/gallery.json; no code change is needed. */
(function () {
  'use strict';
  var grid = document.getElementById('grid');
  var chips = document.getElementById('chips');
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lb-img');
  var items = [], shown = [], current = -1, lastFocus = null;

  function chip(id, label, on) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'yp-chip';
    b.dataset.cat = id;
    b.textContent = label;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    chips.appendChild(b);
  }

  function render(cat) {
    shown = cat === 'all' ? items : items.filter(function (i) { return i.cat === cat; });
    grid.textContent = '';
    shown.forEach(function (it, n) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'yp-tile';
      btn.dataset.index = n;
      btn.setAttribute('aria-label', it.alt);
      var img = document.createElement('img');
      img.src = '../assets/' + it.file;
      img.alt = it.alt;
      img.width = it.w; img.height = it.h;
      img.loading = n < 8 ? 'eager' : 'lazy';
      img.decoding = 'async';
      btn.appendChild(img);
      li.appendChild(btn);
      li.className = 'is-in';
      li.style.animationDelay = Math.min(n, 12) * 40 + 'ms';
      grid.appendChild(li);
    });
  }

  function open(n) {
    current = (n + shown.length) % shown.length;
    var it = shown[current];
    lbImg.src = '../assets/' + it.file;
    lbImg.alt = it.alt;
    if (lb.hidden) { lastFocus = document.activeElement; lb.hidden = false; document.documentElement.style.overflow = 'hidden'; }
    document.getElementById('lb-close').focus();
  }
  function close() {
    lb.hidden = true;
    document.documentElement.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  chips.addEventListener('click', function (e) {
    var b = e.target.closest('.yp-chip');
    if (!b) return;
    Array.prototype.forEach.call(chips.children, function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
    render(b.dataset.cat);
  });
  grid.addEventListener('click', function (e) {
    var t = e.target.closest('.yp-tile');
    if (t) open(Number(t.dataset.index));
  });
  document.getElementById('lb-close').addEventListener('click', close);
  // RTL: "previous" sits on the right.
  document.getElementById('lb-prev').addEventListener('click', function () { open(current - 1); });
  document.getElementById('lb-next').addEventListener('click', function () { open(current + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') open(current - 1);
    else if (e.key === 'ArrowLeft') open(current + 1);
  });

  fetch('../data/gallery.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      items = d.items;
      chip('all', 'הכול', true);
      d.categories.forEach(function (c) {
        if (items.some(function (i) { return i.cat === c.id; })) chip(c.id, c.label, false);
      });
      render('all');
    });
})();
