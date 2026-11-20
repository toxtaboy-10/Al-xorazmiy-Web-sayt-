/* Backend bilan aloqa. Endpointlar ro'yxati: API.md */
(function () {
'use strict';
var C = window.CONFIG || {}, base = (C.apiUrl || '').replace(/\/+$/, ''), MOCK = !base, TK = 'xv_admin_token', RK = 'xv_role', UK = 'xv_user';

function tok() { try { return sessionStorage.getItem(TK) || ''; } catch (e) { return ''; } }
function setTok(t) { try { if (t) sessionStorage.setItem(TK, t); else sessionStorage.removeItem(TK); } catch (e) {} }
function ss(k, v) { try { if (v) sessionStorage.setItem(k, v); else sessionStorage.removeItem(k); } catch (e) {} }
function sg(k) { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } }
function sha(t) {
  if (window.crypto && crypto.subtle && window.TextEncoder) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode('xv:' + t)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  return Promise.resolve('plain:' + t);
}
function fail(status, d) { var e = new Error((d && d.message) || 'Xatolik yuz berdi'); e.status = status; e.errors = (d && d.errors) || {}; return e; }
function qs(o) { var a = []; for (var k in o) if (o[k] !== '' && o[k] != null) a.push(encodeURIComponent(k) + '=' + encodeURIComponent(o[k])); return a.length ? '?' + a.join('&') : ''; }

/* ---------- Haqiqiy backend ---------- */
function http(method, path, body, auth) {
  var h = { Accept: 'application/json' };
  if (body) h['Content-Type'] = 'application/json';
  if (auth && tok()) h.Authorization = 'Bearer ' + tok();
  var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, 15000);
  return fetch(base + path, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined, signal: ctl.signal }).then(function (r) {
    clearTimeout(t);
    if (r.status === 204) return null;
    return r.json().catch(function () { return null; }).then(function (d) { if (!r.ok) throw fail(r.status, d); return d; });
  }, function () { clearTimeout(t); throw fail(0, { message: "Serverga ulanib bo'lmadi. Internetni tekshirib, qayta urinib ko'ring." }); });
}

/* ---------- DEMO rejim (apiUrl bo'sh): ma'lumot faqat shu brauzerda ---------- */
var K = { registrations: 'xv_mock_regs', messages: 'xv_mock_msgs' };
function rd(k) { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } }
function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function wait(fn) { return new Promise(function (res, rej) { setTimeout(function () { try { res(fn()); } catch (e) { rej(e); } }, 300); }); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function need() { if (tok() !== 'demo-token') throw fail(401, { message: 'Sessiya tugadi' }); }
function now() { return new Date().toISOString(); }

function mReg(b) {
  var a = rd(K.registrations), er = {};
  a.forEach(function (x) {
    if (x.username.toLowerCase() === b.username.toLowerCase()) er.username = 'Bu foydalanuvchi nomi band';
    if (x.email.toLowerCase() === b.email.toLowerCase()) er.email = "Bu email allaqachon ro'yxatdan o'tgan";
    if (x.phone === b.phone) er.phone = "Bu raqam allaqachon ro'yxatdan o'tgan";
  });
  if (Object.keys(er).length) throw fail(409, { errors: er });
  return sha(b.password || '').then(function (h) {
    a.push({ id: uid(), username: b.username, email: b.email, phone: b.phone, course: b.course, pw: h, createdAt: now() });
    wr(K.registrations, a); return { ok: true };
  });
}
function pub(x) { var o = {}; for (var k in x) if (k !== 'pw') o[k] = x[k]; return o; }
function mUserLogin(u, p) {
  var l = u.toLowerCase();
  var m = rd(K.registrations).filter(function (x) { return x.username.toLowerCase() === l || x.email.toLowerCase() === l; })[0];
  return sha(p).then(function (h) {
    if (!m || !m.pw || m.pw !== h) throw fail(401, { message: "Login yoki parol noto'g'ri" });
    return { token: 'user:' + m.id, role: 'user', user: pub(m) };
  });
}
function mMsg(b) {
  var a = rd(K.messages);
  a.push({ id: uid(), name: b.name, phone: b.phone, course: b.course, message: b.message, createdAt: now() });
  wr(K.messages, a); return { ok: true };
}
function mList(kind, p) {
  need();
  var q = (p.q || '').toLowerCase(), c = p.course || '';
  var items = rd(K[kind]).map(pub).filter(function (x) { return (!c || x.course === c) && (!q || JSON.stringify(x).toLowerCase().indexOf(q) > -1); })
    .sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  var l = Math.min(+p.limit || 15, 100), pg = Math.max(+p.page || 1, 1);
  return { items: items.slice((pg - 1) * l, pg * l), total: items.length };
}
function mDel(kind, id) { need(); wr(K[kind], rd(K[kind]).filter(function (x) { return x.id !== id; })); return null; }
function mStats() {
  need();
  var r = rd(K.registrations), d = Date.now();
  return {
    registrations: r.length,
    registrationsToday: r.filter(function (x) { return d - new Date(x.createdAt) < 864e5; }).length,
    registrationsWeek: r.filter(function (x) { return d - new Date(x.createdAt) < 7 * 864e5; }).length,
    messages: rd(K.messages).length
  };
}

window.API = {
  mock: MOCK,
  register: function (b) { return MOCK ? wait(function () { return mReg(b); }) : http('POST', '/api/registrations', b); },
  sendMessage: function (b) { return MOCK ? wait(function () { return mMsg(b); }) : http('POST', '/api/messages', b); },
  login: function (u, p) {
    var r = MOCK ? wait(function () {
      if (u === 'admin' && p === 'admin12345') return { token: 'demo-token', role: 'admin' };
      return mUserLogin(u, p);
    }) : http('POST', '/api/login', { username: u, password: p });
    return r.then(function (d) {
      if (!d || !d.token) throw fail(500, { message: "Serverdan noto'g'ri javob keldi" });
      var role = d.role === 'user' ? 'user' : 'admin';
      setTok(d.token); ss(RK, role); ss(UK, role === 'user' && d.user ? JSON.stringify(d.user) : '');
      d.role = role; return d;
    });
  },
  logout: function () { setTok(''); ss(RK, ''); ss(UK, ''); },
  loggedIn: function () { return !!tok(); },
  role: function () { return sg(RK) || 'admin'; },
  me: function () {
    if (MOCK) return wait(function () {
      var id = tok().replace('user:', '');
      var m = rd(K.registrations).filter(function (x) { return x.id === id; })[0];
      if (!m) throw fail(401, { message: 'Sessiya tugadi' });
      return pub(m);
    });
    return http('GET', '/api/me', null, true);
  },
  list: function (kind, p) { return MOCK ? wait(function () { return mList(kind, p); }) : http('GET', '/api/admin/' + kind + qs(p), null, true); },
  remove: function (kind, id) { return MOCK ? wait(function () { return mDel(kind, id); }) : http('DELETE', '/api/admin/' + kind + '/' + encodeURIComponent(id), null, true); },
  stats: function () { return MOCK ? wait(mStats) : http('GET', '/api/admin/stats', null, true); }
};
})();
