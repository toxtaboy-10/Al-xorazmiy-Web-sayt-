(function () {
'use strict';
function $(s, c) { return (c || document).querySelector(s); }
function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
var C = window.CONFIG || {};
var rm = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
var hov = window.matchMedia && matchMedia('(hover:hover)').matches;
var root = document.documentElement, nofx = document.body.hasAttribute('data-nofx');

/* ---------- Sozlamalarni sahifaga qo'llash ---------- */
$$('[data-social]').forEach(function (a) {
  var v = C[a.dataset.social];
  if (!v) { a.hidden = true; return; }
  a.href = v; a.target = '_blank'; a.rel = 'noopener noreferrer';
});
$$('[data-cfg]').forEach(function (e) {
  var k = e.dataset.cfg, v = C[k];
  if (!v) { (e.closest('[data-hide-empty]') || e).hidden = true; return; }
  e.textContent = v;
  if (e.tagName === 'A') e.href = (k === 'email' ? 'mailto:' : 'tel:') + v.replace(/\s/g, '');
});
$$('[data-map]').forEach(function (f) { if (C.mapEmbed) f.src = C.mapEmbed; else (f.closest('[data-hide-empty]') || f).hidden = true; });
$$('[data-year]').forEach(function (e) { e.textContent = new Date().getFullYear(); });

/* ---------- Logo: fayl bo'lsa ko'rsatiladi, bo'lmasa "IT" belgisi qoladi ---------- */
$$('.logo').forEach(function (l) {
  var im = $('.logo-img', l), nm = $('.lname', l);
  if (nm && C.showLogoName === false) { nm.hidden = true; if (im) im.alt = 'Al-Xorazmiy Vorislari'; }
  if (!im || !C.logo) return;
  im.onload = function () { im.hidden = false; l.classList.add('has-img'); };
  im.src = C.logo;
});

/* ---------- Mavzu (qorong'i/yorug') ---------- */
var tb = $('#theme');
function setTheme(t) {
  root.setAttribute('data-theme', t);
  try { localStorage.setItem('theme', t); } catch (e) {}
  if (tb) tb.setAttribute('aria-label', t === 'dark' ? "Yorug' rejimga o'tish" : "Qorong'i rejimga o'tish");
}
if (tb) { setTheme(root.getAttribute('data-theme') || 'light'); tb.addEventListener('click', function () { setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); }); }

/* ---------- Mobil menyu ---------- */
var bg = $('#burger'), nav = $('#nav');
if (bg && nav) {
  function closeNav() { nav.classList.remove('open'); bg.setAttribute('aria-expanded', 'false'); }
  bg.addEventListener('click', function () { var o = nav.classList.toggle('open'); bg.setAttribute('aria-expanded', o ? 'true' : 'false'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) closeNav(); });
}

/* ---------- Kurslar filtri ---------- */
var chips = $$('.chip');
if (chips.length) chips.forEach(function (c) {
  c.addEventListener('click', function () {
    var k = c.dataset.filter;
    chips.forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
    $$('[data-cat]').forEach(function (card) {
      var hide = k !== 'all' && card.dataset.cat !== k;
      card.classList.toggle('hide', hide);
      if (!hide) { card.classList.add('in'); card.style.transitionDelay = '0ms'; } /* animatsiya tufayli ko'rinmay qolmasin */
    });
  });
});

/* ---------- Scroll: progress, header, tepaga tugma ---------- */
var prog = $('#prog'), hd = $('header'), up = $('#totop'), tick = false;
function onScroll() {
  var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
  if (prog) prog.style.width = (h > 0 ? y / h * 100 : 0) + '%';
  if (hd) hd.classList.toggle('stuck', y > 8);
  if (up) up.classList.toggle('show', y > 500);
  tick = false;
}
window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
if (up) up.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: rm ? 'auto' : 'smooth' }); });
onScroll();

/* ---------- Effektlar: paydo bo'lish, hisoblagich, karta nuri, tilt, kursor nuri ---------- */
if (!nofx) {
  var rv = $$('.card,.head,.split>*,.stats div,.cta .wrap>*,details,.chips,.step');
  if ('IntersectionObserver' in window && !rm) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .12 });
    rv.forEach(function (e, i) { e.classList.add('rv'); e.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(e); });
  }
  $$('[data-count]').forEach(function (el) {
    var n = +el.dataset.count, suf = el.dataset.suffix || '';
    if (rm || !('IntersectionObserver' in window)) { el.textContent = n + suf; return; }
    var o = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; o.disconnect();
      var t0 = performance.now();
      (function f(t) { var p = Math.min((t - t0) / 1100, 1); el.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))) + suf; if (p < 1) requestAnimationFrame(f); })(t0);
    }, { threshold: .6 });
    o.observe(el);
  });
  if (hov && !rm) {
    $$('.card').forEach(function (c) {
      c.addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
    });
    var hi = $('.hero-img');
    if (hi) {
      hi.addEventListener('pointermove', function (e) { var r = hi.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; hi.style.transform = 'perspective(900px) rotateY(' + x * 8 + 'deg) rotateX(' + -y * 8 + 'deg)'; });
      hi.addEventListener('pointerleave', function () { hi.style.transform = ''; });
    }
    var g = document.createElement('div'), gx = 0, gy = 0, gt = false;
    g.className = 'glow'; g.setAttribute('aria-hidden', 'true'); document.body.appendChild(g);
    document.addEventListener('pointermove', function (e) {
      gx = e.clientX; gy = e.clientY;
      if (!gt) { gt = true; requestAnimationFrame(function () { g.style.transform = 'translate(' + gx + 'px,' + gy + 'px)'; g.classList.add('on'); gt = false; }); }
    }, { passive: true });
  }
}

/* ---------- Konfetti (muvaffaqiyatli ro'yxatdan o'tganda) ---------- */
function confetti() {
  if (rm) return;
  var c = document.createElement('canvas'), x = c.getContext('2d'), P = [], t = 0, cols = ['#6366F1', '#8B5CF6', '#EC4899', '#06B6D4', '#F59E0B', '#10B981'];
  c.width = innerWidth; c.height = innerHeight; c.setAttribute('aria-hidden', 'true');
  c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:200';
  document.body.appendChild(c);
  for (var i = 0; i < 110; i++) P.push({ x: c.width / 2, y: c.height * .4, vx: (Math.random() - .5) * 14, vy: Math.random() * -12 - 3, s: Math.random() * 7 + 4, c: cols[i % 6], r: Math.random() * 6, vr: (Math.random() - .5) * .4 });
  (function f() {
    x.clearRect(0, 0, c.width, c.height);
    P.forEach(function (p) { p.vy += .35; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); x.restore(); });
    if (++t < 110) requestAnimationFrame(f); else c.remove();
  })();
}

/* ---------- Formalar ---------- */
function normPhone(v) {
  var d = v.replace(/\D/g, '');
  if (d.length === 9) d = '998' + d;
  if (d.length === 12 && d.indexOf('998') === 0) return '+' + d;
  if (/^\s*\+/.test(v) && d.length >= 10 && d.length <= 15) return '+' + d;
  return '';
}
function fmtPhone(d) {
  var s = '+' + d.slice(0, 3);
  [[3, 5], [5, 8], [8, 10], [10, 12]].forEach(function (r) { if (d.length > r[0]) s += ' ' + d.slice(r[0], r[1]); });
  return s;
}
var RULES = {
  name: function (v) { return v.trim().length >= 2 ? '' : 'Ismingizni kiriting'; },
  username: function (v) { return /^[A-Za-z][A-Za-z0-9._]{2,23}$/.test(v.trim()) ? '' : "3-24 belgi: lotin harflari, raqam, nuqta yoki _ ; harf bilan boshlansin"; },
  email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : "Email manzilini to'g'ri kiriting"; },
  phone: function (v) { return normPhone(v) ? '' : "Telefon raqamini to'g'ri kiriting (+998 90 123 45 67)"; },
  password: function (v) { return v.length >= 6 ? '' : 'Parol kamida 6 ta belgidan iborat bo\'lsin'; },
  course: function (v) { return v ? '' : "Yo'nalishni tanlang"; },
  message: function (v) { v = v.trim(); return v.length < 5 ? 'Xabaringizni yozing (kamida 5 belgi)' : v.length > 1000 ? 'Xabar juda uzun' : ''; },
  consent: function (v, el) { return el.checked ? '' : 'Davom etish uchun rozilik bering'; }
};

$$('[data-v=phone]').forEach(function (p) {
  p.addEventListener('focus', function () { if (!p.value) p.value = '+998 '; });
  p.addEventListener('input', function () {
    var d = p.value.replace(/\D/g, '');
    if (d.indexOf('998998') === 0) d = d.slice(3); /* qo'yib yuborilganda (paste) +998 ikki marta chiqmasin */
    if (d.indexOf('998') === 0) p.value = fmtPhone(d.slice(0, 12));
  });
});
$$('textarea[maxlength]').forEach(function (t) {
  var n = $('[data-cnt]', t.parentNode);
  if (n) t.addEventListener('input', function () { n.textContent = t.value.length; });
});

function initForm(form, send) {
  var btn = $('button[type=submit]', form), lbl = btn.textContent, ok = $('.ok', form), fl = $('.fail', form), busy = false;
  function setErr(f, msg) {
    var s = $('#' + f.name + '-err'); if (s) s.textContent = msg;
    f.setAttribute('aria-invalid', msg ? 'true' : 'false'); return !msg;
  }
  function check(f) { return setErr(f, RULES[f.dataset.v](f.value, f)); }
  $$('[data-v]', form).forEach(function (f) {
    f.addEventListener('blur', function () { if (f.type !== 'checkbox' && f.value.trim()) check(f); });
    f.addEventListener('input', function () { if (f.getAttribute('aria-invalid') === 'true') check(f); });
    f.addEventListener('change', function () { if (f.type === 'checkbox' || f.tagName === 'SELECT') check(f); });
  });
  var cp = new URLSearchParams(location.search).get('c'), map = { dev: 'Dasturlash', design: 'Dizayn', sec: 'Kiberxavfsizlik', bpo: 'BPO / Call markaz', eng: 'Ingliz tili' };
  if (cp && map[cp] && form.elements.course) form.elements.course.value = map[cp];

  form.addEventListener('submit', function (ev) {
    ev.preventDefault(); if (busy) return;
    ok.classList.remove('show'); fl.hidden = true;
    var bad = null;
    $$('[data-v]', form).forEach(function (f) { if (!check(f) && !bad) bad = f; });
    if (bad) { bad.focus(); return; }
    if (form.elements.website && form.elements.website.value) { ok.classList.add('show'); form.reset(); return; } /* honeypot: bot */
    var d = {};
    $$('[data-v]', form).forEach(function (f) { if (f.type !== 'checkbox') d[f.name] = f.value.trim(); });
    if (d.phone) d.phone = normPhone(d.phone);
    if (form.elements.consent) d.consent = true;
    busy = true; btn.disabled = true; btn.textContent = 'Yuborilmoqda…';
    send(d).then(function () {
      form.reset(); ok.classList.add('show');
      $$('[data-cnt]', form).forEach(function (n) { n.textContent = '0'; });
      if (form.dataset.form === 'register') confetti();
    }, function (e) {
      var shown = false;
      Object.keys(e.errors || {}).forEach(function (k) {
        var f = form.elements[k];
        if (f) { setErr(f, e.errors[k]); if (!shown) { f.focus(); shown = true; } }
      });
      if (!shown) { fl.textContent = e.status === 429 ? "Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring." : (e.message || 'Xatolik yuz berdi'); fl.hidden = false; }
    }).then(function () { busy = false; btn.disabled = false; btn.textContent = lbl; });
  });
}
if (window.API) {
  var rf = $('#register-form'), cf = $('#contact-form');
  if (rf) initForm(rf, API.register);
  if (cf) initForm(cf, API.sendMessage);
}
})();
