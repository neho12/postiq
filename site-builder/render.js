// Renders a site spec (see lib/site-spec.js) plus uploaded photos into a full HTML page.
// Everything from the spec is escaped; the model never writes markup.

export const THEME_COLORS = {
  copper: ['#C17A44', '#E09A60'],
  emerald: ['#2F9E73', '#6FD3A5'],
  rose: ['#D9658A', '#F2A5BE'],
  blue: ['#4C8DFF', '#9BBFFF'],
  gold: ['#B8932F', '#E6C463'],
  mono: ['#9A968A', '#E8E6DC'],
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function waNumber(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('972')) return d;
  if (d.startsWith('0')) return '972' + d.slice(1);
  return d;
}

export function renderSite(spec, photos = []) {
  const s = spec || {};
  const [a, b] = THEME_COLORS[s.theme] || THEME_COLORS.copper;
  const wa = waNumber(s.phone);
  const waLink = wa ? `https://wa.me/${wa}?text=${encodeURIComponent('היי, הגעתי מהאתר ואשמח לפרטים')}` : '#contact';
  const tel = wa ? `tel:+${wa}` : '#contact';
  const name = s.business_name || 'העסק שלך';
  const cta = s.cta_label || 'יצירת קשר';
  const year = /^\d{4}$/.test(s.since_year || '') ? Number(s.since_year) : 0;
  const yrs = year ? new Date().getFullYear() - year : 0;
  const hero = photos[0];
  const gallery = photos.length > 1 ? photos.slice(1) : [];

  const words = esc(name).split(/\s+/);
  const h1 = words.map((w, i) => `<span class="ln"><span${i === 1 ? ' class="cp"' : (i > 0 && i === words.length - 1 ? ' class="fill"' : '')}>${w}</span></span>`).join('');
  const mq = (s.marquee?.length ? s.marquee : [s.business_type || name]).map((w) => `<span>${esc(w)}</span><b>✦</b>`).join('');
  const services = (s.services || []).map((v, i) => `<li class="rv"><span class="i">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(v.title)}</h3>${v.description ? `<p>${esc(v.description)}</p>` : ''}</div>${v.price ? `<span class="pr">${esc(v.price)}</span>` : '<span class="ar">←</span>'}</li>`).join('');
  const faq = (s.faq || []).map((f) => `<details class="rv"><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p></details>`).join('');
  const info = [
    s.phone && `<a class="ci rv" href="${tel}"><small>טלפון</small><b dir="ltr">${esc(s.phone)}</b></a>`,
    (s.address || s.city) && `<div class="ci rv"><small>כתובת</small><b>${esc([s.address, s.city].filter(Boolean).join(', '))}</b></div>`,
    s.hours && `<div class="ci rv"><small>שעות פעילות</small><b>${esc(s.hours)}</b></div>`,
    s.instagram && `<a class="ci rv" href="https://www.instagram.com/${esc(s.instagram)}/" target="_blank" rel="noopener"><small>אינסטגרם</small><b dir="ltr">@${esc(s.instagram)}</b></a>`,
  ].filter(Boolean).join('');

  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(name)}${s.business_type ? ' · ' + esc(s.business_type) : ''}</title>
<meta name="description" content="${esc(s.intro || s.tagline || name)}">
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;800;900&display=swap" rel="stylesheet">
<style>
:root{--bg:#0E0D0B;--bg2:#161411;--text:#F2F3E5;--muted:#A39F8A;--line:rgba(242,243,229,.12);--a:${a};--b:${b};--e:cubic-bezier(.2,.8,.2,1)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text);font-family:Heebo,system-ui,sans-serif;font-size:17px;line-height:1.65;overflow-x:hidden;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}h1,h2,h3{margin:0;line-height:1.05;font-weight:800;letter-spacing:-.02em}.w{max-width:1120px;margin:0 auto;padding:0 20px}
.lbl{font-size:13px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--b);display:inline-flex;align-items:center;gap:10px}.lbl:before{content:"";width:26px;height:1.5px;background:currentColor}
.nav{position:fixed;top:0;left:0;right:0;z-index:50;transition:background .4s}.nav.s{background:rgba(14,13,11,.78);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}.nav .w{display:flex;align-items:center;justify-content:space-between;height:66px}.nav b{font-size:18px;font-weight:800}
.btn{display:inline-flex;align-items:center;justify-content:center;padding:14px 26px;border-radius:999px;font-weight:700;background:var(--a);color:#14110D;border:1.5px solid var(--a);transition:transform .3s,background .3s}.btn:hover{transform:translateY(-3px);background:var(--b)}.btn.g{background:transparent;color:var(--text);border-color:var(--line)}.nav .btn{padding:9px 18px;font-size:14px}
.hero{position:relative;min-height:100svh;display:flex;align-items:center;padding:100px 0 60px;overflow:hidden}.hero:before{content:"";position:absolute;inset:0;background:radial-gradient(520px circle at var(--mx,28%) var(--my,40%),color-mix(in srgb,var(--a) 24%,transparent),transparent 62%)}
.hero .w{position:relative;display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center;width:100%}.hero h1{font-size:clamp(46px,8.4vw,116px);font-weight:900;letter-spacing:-.045em;line-height:.95;margin-top:20px}
.ln{display:block;overflow:hidden;padding-bottom:.08em}.ln>span{display:inline-block;transform:translateY(110%);transition:transform 1.1s var(--e)}.ok .ln>span{transform:none}.ok .ln:nth-child(2)>span{transition-delay:.12s}.ok .ln:nth-child(3)>span{transition-delay:.24s}
.cp{color:transparent;-webkit-text-stroke:1.5px var(--b)}.fill{background:linear-gradient(100deg,var(--b),var(--a));-webkit-background-clip:text;background-clip:text;color:transparent}
.tag{font-size:clamp(19px,2.2vw,26px);font-weight:700;margin:24px 0 8px}.intro{color:var(--muted);max-width:32em;margin:0 0 30px}
.fd{opacity:0;transform:translateY(18px);transition:opacity .9s var(--e),transform .9s var(--e)}.ok .fd{opacity:1;transform:none;transition-delay:.5s}.cta{display:flex;flex-wrap:wrap;gap:12px}
.medal{position:relative;justify-self:center;width:min(100%,420px);aspect-ratio:1}.disc{position:absolute;inset:8%;border-radius:32px;overflow:hidden;background:var(--bg2);box-shadow:0 40px 80px -20px #000;transform:scale(.85) rotate(-7deg);opacity:0;transition:transform 1.4s var(--e) .3s,opacity 1s .3s}.ok .disc{transform:none;opacity:1}.disc img{width:100%;height:100%;object-fit:cover}.disc.empty{display:grid;place-items:center;background:linear-gradient(135deg,var(--a),var(--b))}.disc.empty span{font-size:140px;font-weight:900;color:#14110D}
.mq{padding:24px 0;border-block:1px solid var(--line);background:var(--bg2);overflow:hidden}.mqi{display:flex;width:max-content;animation:mq 28s linear infinite}.mqr{display:flex;align-items:center;gap:40px;padding-left:40px;font-size:clamp(30px,5vw,60px);font-weight:900;letter-spacing:-.03em;white-space:nowrap}.mqr span:nth-child(4n+1){color:transparent;-webkit-text-stroke:1.2px rgba(242,243,229,.55)}.mqr b{color:var(--b);font-size:.5em}@keyframes mq{to{transform:translateX(50%)}}
section{padding:110px 0;scroll-margin-top:66px}.hd h2{font-size:clamp(36px,5.2vw,68px);margin:14px 0 46px}.rv{opacity:0;transform:translateY(34px);transition:opacity 1s var(--e),transform 1s var(--e)}.rv.in{opacity:1;transform:none}
.sv{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}.sv li{display:grid;grid-template-columns:64px 1fr auto;align-items:center;gap:18px;padding:26px 4px;border-bottom:1px solid var(--line);transition:padding .4s var(--e)}.sv li:hover{padding-right:20px}.sv li:hover h3{color:var(--b)}.sv h3{font-size:clamp(22px,3vw,36px);font-weight:700;transition:color .3s}.sv p{margin:4px 0 0;color:var(--muted);font-size:15px}.sv .i{color:#6F6B5C;font-size:14px}.sv .ar{width:44px;height:44px;border-radius:50%;border:1px solid var(--line);display:grid;place-items:center}.sv .pr{font-weight:800;color:var(--b);white-space:nowrap}
.ab .w{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}.ab p{color:var(--muted);font-size:18px}.st{display:flex;gap:30px;flex-wrap:wrap;margin-top:26px}.st b{display:block;direction:ltr;text-align:right;font-size:46px;font-weight:900;color:var(--b);line-height:1}.st span{font-size:14px;color:var(--muted)}
.gl{background:var(--bg2)}.gg{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));grid-auto-rows:320px;gap:14px}.gg figure{margin:0;border-radius:18px;overflow:hidden}.gg img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s var(--e)}.gg figure:hover img{transform:scale(1.07)}
details{border-bottom:1px solid var(--line);padding:20px 0}summary{cursor:pointer;font-size:20px;font-weight:700;list-style:none}summary::-webkit-details-marker{display:none}summary:after{content:"+";float:left;color:var(--b);font-size:24px;line-height:1}details[open] summary:after{content:"–"}details p{color:var(--muted);margin:12px 0 0}
.cb{border-radius:28px;padding:clamp(36px,7vw,84px);background:linear-gradient(120deg,var(--a),var(--b));color:#14110D}.cb h2{font-size:clamp(42px,8vw,110px);font-weight:900;letter-spacing:-.05em;line-height:.92;margin:16px 0 18px}.cb p{max-width:28em;margin:0 0 30px;font-size:18px}.cb .btn{background:#0E0D0B;color:#F2F3E5;border-color:#0E0D0B}.cb .btn.g{background:transparent;color:#0E0D0B;border-color:rgba(14,13,11,.4)}.cb .lbl{color:#0E0D0B}
.inf{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:16px}.ci{padding:20px;border-radius:16px;border:1px solid var(--line);background:var(--bg2)}.ci small{display:block;font-size:13px;color:var(--muted)}.ci b{font-weight:600}
footer{border-top:1px solid var(--line);padding:26px 0 100px;font-size:14px;color:#6F6B5C}footer .w{display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px}
.fab{position:fixed;bottom:18px;left:18px;z-index:60;width:58px;height:58px;border-radius:50%;background:#25D366;color:#fff;display:grid;place-items:center;font-size:26px;box-shadow:0 12px 28px rgba(0,0,0,.45)}
@media(max-width:860px){.hero .w,.ab .w{grid-template-columns:1fr}.hero .w{text-align:center}.medal{order:-1;width:min(68vw,290px)}.cta{justify-content:center}.intro{margin-inline:auto}section{padding:80px 0}.gg{grid-auto-rows:240px}.sv li{grid-template-columns:1fr auto}.sv .i{display:none}}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.rv,.fd,.ln>span{opacity:1!important;transform:none!important}.disc{opacity:1;transform:none}}
</style></head><body>
<header class="nav" id="nav"><div class="w"><b>${esc(name)}</b><a class="btn" href="${waLink}" target="_blank" rel="noopener">${esc(cta)}</a></div></header>
<section class="hero" id="hero"><div class="w"><div>
<div class="lbl fd">${esc(s.business_type || '')}${s.city ? ' · ' + esc(s.city) : ''}</div><h1>${h1}</h1>
${s.tagline ? `<p class="tag fd">${esc(s.tagline)}</p>` : ''}${s.intro ? `<p class="intro fd">${esc(s.intro)}</p>` : ''}
<div class="cta fd"><a class="btn" href="${waLink}" target="_blank" rel="noopener">${esc(cta)}</a>${services ? '<a class="btn g" href="#services">השירותים</a>' : ''}</div></div>
<div class="medal">${hero ? `<div class="disc"><img src="${hero}" alt=""></div>` : `<div class="disc empty"><span>${esc(name.trim().charAt(0))}</span></div>`}</div></div></section>
<div class="mq" aria-hidden="true"><div class="mqi"><div class="mqr">${mq}</div><div class="mqr">${mq}</div></div></div>
${services ? `<section id="services"><div class="w"><div class="hd rv"><span class="lbl">Services</span><h2>השירותים</h2></div><ul class="sv">${services}</ul></div></section>` : ''}
${s.about_text ? `<section class="ab"><div class="w"><div class="hd rv"><span class="lbl">About</span><h2>${esc(s.about_title || 'עלינו')}</h2></div><div class="rv"><p>${esc(s.about_text)}</p>${yrs > 0 ? `<div class="st"><div><b>${year}</b><span>שנת הקמה</span></div><div><b>${yrs}+</b><span>שנות ניסיון</span></div></div>` : ''}</div></div></section>` : ''}
${gallery.length ? `<section class="gl"><div class="w"><div class="hd rv"><span class="lbl">Gallery</span><h2>מהעבודות</h2></div><div class="gg">${gallery.map((src) => `<figure class="rv"><img src="${src}" alt="" loading="lazy"></figure>`).join('')}</div></div></section>` : ''}
${faq ? `<section><div class="w"><div class="hd rv"><span class="lbl">FAQ</span><h2>שאלות נפוצות</h2></div>${faq}</div></section>` : ''}
<section id="contact"><div class="w"><div class="cb rv"><span class="lbl">Contact</span><h2>בואו נדבר.</h2><p>שלחו הודעה ונחזור אליכם בהקדם.</p><div class="cta"><a class="btn" href="${waLink}" target="_blank" rel="noopener">וואטסאפ</a>${wa ? `<a class="btn g" href="${tel}">התקשרו</a>` : ''}</div></div>${info ? `<div class="inf">${info}</div>` : ''}</div></section>
<footer><div class="w"><span>© ${esc(name)}</span><span>${esc(s.tagline || '')}</span></div></footer>
${wa ? `<a class="fab" href="${waLink}" target="_blank" rel="noopener" aria-label="וואטסאפ">✆</a>` : ''}
<script>(function(){var h=document.documentElement,n=document.getElementById("nav");requestAnimationFrame(function(){setTimeout(function(){h.classList.add("ok")},80)});
addEventListener("scroll",function(){n.classList.toggle("s",scrollY>40)},{passive:true});
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{threshold:.12});document.querySelectorAll(".rv").forEach(function(e){io.observe(e)});
var hr=document.getElementById("hero");hr.addEventListener("pointermove",function(e){var r=hr.getBoundingClientRect();hr.style.setProperty("--mx",(e.clientX-r.left)+"px");hr.style.setProperty("--my",(e.clientY-r.top)+"px")});})();<\/script>
</body></html>`;
}
