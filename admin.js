(function () {
'use strict';
const $ = (s, c) => (c || document).querySelector(s);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const COLS = {
  registrations: [['username', 'Foydalanuvchi'], ['email', 'Email'], ['phone', 'Telefon'], ['course', "Yo'nalish"], ['createdAt', 'Sana']],
  messages: [['name', 'Ism'], ['phone', 'Telefon'], ['course', "Yo'nalish"], ['message', 'Xabar'], ['createdAt', 'Sana']]
};
const S = { tab: 'registrations', page: 1, limit: 15, q: '', course: '', total: 0, seq: 0, pending: null };

function fmt(i) {
  const d = new Date(i); if (isNaN(d)) return '';
  const p = n => String(n).padStart(2, '0');
  return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
let tt;
function toast(msg, bad) {
  const t = $('#toast'); t.textContent = msg; t.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(tt); tt = setTimeout(() => { t.className = ''; }, 3200);
}
function view(mode) { /* mode: 'admin' | 'user' | false (kirish oynasi) */
  $('#login').hidden = !!mode; $('#app').hidden = mode !== 'admin'; $('#me').hidden = mode !== 'user';
}
function showMe(u) {
  const set = (id, v) => { $('#me-' + id).textContent = v || '—'; };
  set('name', u.username); set('username', u.username); set('email', u.email); set('phone', u.phone); set('course', u.course); set('date', fmt(u.createdAt));
  view('user');
}
function out(msg) {
  API.logout(); view(false);
  const f = $('#lfail'); if (msg) { f.textContent = msg; f.hidden = false; }
}
function setBusy(b) { $('.tw').classList.toggle('busy', b); }
function onErr(e) {
  if (e.status === 401) return out('Sessiya tugadi. Qayta kiring.');
  setBusy(false); toast(e.message || 'Xatolik', true);
}

/* ---------- Jadval ---------- */
function render(items) {
  const th = $('#thead'), tb = $('#tbody'), cols = COLS[S.tab];
  th.textContent = ''; tb.textContent = '';
  const hr = el('tr'); cols.forEach(c => hr.appendChild(el('th', null, c[1]))); hr.appendChild(el('th', null, '')); th.appendChild(hr);
  items.forEach(it => {
    const r = el('tr');
    cols.forEach(c => {
      const td = el('td', c[0] === 'message' ? 'msg' : '', c[0] === 'createdAt' ? fmt(it.createdAt) : it[c[0]]);
      td.dataset.label = c[1]; r.appendChild(td);
    });
    const a = el('td'), b = el('button', 'rbtn', "O'chirish");
    b.type = 'button'; b.setAttribute('aria-label', "O'chirish: " + (it.username || it.name || ''));
    b.addEventListener('click', () => ask(it)); a.appendChild(b); r.appendChild(a); tb.appendChild(r);
  });
  $('#empty').hidden = items.length > 0;
  const pages = Math.max(1, Math.ceil(S.total / S.limit));
  const from = S.total ? (S.page - 1) * S.limit + 1 : 0;
  $('#pinfo').textContent = from + '–' + Math.min(S.page * S.limit, S.total) + ' / ' + S.total;
  $('#prev').disabled = S.page <= 1; $('#next').disabled = S.page >= pages;
}
function load() {
  const id = ++S.seq; setBusy(true);
  API.list(S.tab, { page: S.page, limit: S.limit, q: S.q, course: S.course }).then(d => {
    if (id !== S.seq) return;
    S.total = d.total || 0;
    const pages = Math.max(1, Math.ceil(S.total / S.limit));
    if (S.page > pages) { S.page = pages; return load(); }
    render(d.items || []); setBusy(false);
  }, e => { if (id === S.seq) onErr(e); });
}
function stats() {
  const set = (id, v) => { $('#' + id).textContent = v == null ? '—' : v; };
  API.stats().then(s => { set('k1', s.registrations); set('k2', s.registrationsToday); set('k3', s.registrationsWeek); set('k4', s.messages); }, e => { if (e.status === 401) onErr(e); });
}

/* ---------- O'chirish ---------- */
function ask(it) {
  S.pending = it;
  $('#dtext').textContent = '"' + (it.username || it.name || '') + '" yozuvi butunlay o\'chiriladi. Buni ortga qaytarib bo\'lmaydi.';
  $('#dlg').showModal();
}
$('#dlg').addEventListener('close', () => {
  if ($('#dlg').returnValue !== 'ok' || !S.pending) return;
  const it = S.pending; S.pending = null;
  API.remove(S.tab, it.id).then(() => { toast("O'chirildi"); load(); stats(); }, onErr);
});

/* ---------- CSV eksport (joriy filtr bo'yicha hammasi) ---------- */
function cell(v) {
  v = String(v == null ? '' : v);
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;           /* CSV injection (Excel formulalari) dan himoya */
  return '"' + v.replace(/"/g, '""') + '"';
}
function exportCsv() {
  const btn = $('#export'), cols = COLS[S.tab]; let all = [], pg = 1; btn.disabled = true;
  const done = () => { btn.disabled = false; };
  (function next() {
    API.list(S.tab, { page: pg, limit: 100, q: S.q, course: S.course }).then(d => {
      const it = d.items || []; all = all.concat(it);
      if (it.length && all.length < (d.total || 0) && pg < 200) { pg++; return next(); }
      const rows = [cols.map(c => cell(c[1])).join(',')];
      all.forEach(x => rows.push(cols.map(c => cell(c[0] === 'createdAt' ? fmt(x.createdAt) : x[c[0]])).join(',')));
      const blob = new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const a = el('a'); a.href = URL.createObjectURL(blob); a.download = S.tab + '-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      toast(all.length + ' ta yozuv yuklandi'); done();
    }, e => { done(); onErr(e); });
  })();
}

/* ---------- Boshqaruv ---------- */
function enter() {
  if (API.role() === 'user') { API.me().then(showMe, e => out(e.status === 401 ? 'Sessiya tugadi. Qayta kiring.' : (e.message || 'Xatolik'))); return; }
  view('admin'); stats(); load();
}
$('#lform').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, b = $('button', f), fl = $('#lfail'); fl.hidden = true;
  const u = f.username.value.trim(), p = f.password.value;
  if (!u || !p) { fl.textContent = 'Login va parolni kiriting'; fl.hidden = false; return; }
  b.disabled = true;
  API.login(u, p).then(() => { f.reset(); enter(); }, err => {
     fl.textContent = err.status === 401 ? "Login yoki parol noto'g'ri" : (err.message || 'Xatolik'); fl.hidden = false;
  }).then(() => { b.disabled = false; });
});
$('#logout').addEventListener('click', () => out(''));
$('#logout2').addEventListener('click', () => out(''));
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  S.tab = t.dataset.tab; S.page = 1; S.q = ''; S.course = ''; $('#q').value = ''; $('#cf').value = '';
  document.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-selected', x === t ? 'true' : 'false'));
  load();
}));
let dt;
$('#q').addEventListener('input', e => { clearTimeout(dt); dt = setTimeout(() => { S.q = e.target.value.trim(); S.page = 1; load(); }, 300); });
$('#cf').addEventListener('change', e => { S.course = e.target.value; S.page = 1; load(); });
$('#prev').addEventListener('click', () => { if (S.page > 1) { S.page--; load(); } });
$('#next').addEventListener('click', () => { S.page++; load(); });
$('#refresh').addEventListener('click', () => { stats(); load(); });
$('#export').addEventListener('click', exportCsv);

if (API.mock) { $('#demo').hidden = false; $('#lhint').hidden = false; }
if (API.loggedIn()) enter(); else view(false);
})();
