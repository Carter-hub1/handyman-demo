(function () {
  'use strict';
  var API = String(window.SAM_API || '').replace(/\/$/, '');
  var KEY = 'willowlane.owner.v1';
  var token = '';
  try { token = sessionStorage.getItem(KEY) || ''; } catch (e) { /* storage blocked */ }

  var login = document.getElementById('login');
  var pass = document.getElementById('pass');
  var loginMsg = document.getElementById('loginmsg');
  var inbox = document.getElementById('inbox');
  var listEl = document.getElementById('list');
  var detail = document.getElementById('detail');
  var statusEl = document.getElementById('status');
  var cNew = document.getElementById('cNew');
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));

  var items = [];
  var filter = 'new';
  var selected = '';
  var timer = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function isBlank(v) { return !v || /^[\(\[][^\)\]]*[\)\]]$/.test(v) || /^(n\/a|not given|not provided|unknown|-+)\.?$/i.test(v); }
  function when(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  function pill(u) {
    var n = el('span', 'pill ' + (u === 'emergency' || u === 'urgent' ? u : 'routine'), u.charAt(0).toUpperCase() + u.slice(1));
    return n;
  }

  async function api(path, opts) {
    opts = opts || {};
    var headers = { Authorization: 'Bearer ' + token };
    if (opts.body) headers['content-type'] = 'application/json';
    var res = await fetch(API + path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
    var data = {};
    try { data = await res.json(); } catch (e) { /* not JSON */ }
    if (!res.ok) {
      var err = new Error(data.message || 'Something went wrong. Try again.');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function showLogin(msg) {
    inbox.hidden = true; login.hidden = false;
    loginMsg.textContent = msg || '';
    clearInterval(timer); timer = null;
    token = '';
    try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    pass.value = ''; pass.focus();
  }

  function render() {
    var shown = items.filter(function (i) { return filter === 'all' || i.status === filter; });
    var fresh = items.filter(function (i) { return i.status === 'new'; }).length;
    cNew.textContent = fresh ? '(' + fresh + ')' : '';
    listEl.textContent = '';
    if (!shown.length) {
      var msg = items.length ? 'Nothing here.' : 'No enquiries yet. Finish a chat on the website that ends in an appointment request and it will appear here.';
      listEl.appendChild(el('li', 'in-empty', msg));
      return;
    }
    shown.forEach(function (i) {
      var li = el('li');
      var b = el('button', 'inrow' + (i.id === selected ? ' on' : ''));
      b.type = 'button';
      if (i.id === selected) b.setAttribute('aria-current', 'true');
      var top = el('span', 'in-top');
      top.appendChild(el('strong', null, i.name || 'No name given'));
      top.appendChild(pill(i.urgency));
      b.appendChild(top);
      b.appendChild(el('span', 'in-job', i.job || 'Service not given'));
      var meta = when(i.created) + (i.photos ? ', ' + i.photos + (i.photos === 1 ? ' photo' : ' photos') : '') + (i.status === 'handled' ? ', handled' : '');
      b.appendChild(el('span', 'in-meta', meta));
      b.addEventListener('click', function () { open(i.id); });
      li.appendChild(b);
      listEl.appendChild(li);
    });
  }

  async function refresh(quiet) {
    try {
      if (!quiet) statusEl.textContent = 'Loading...';
      var d = await api('/owner/enquiries');
      items = d.items || [];
      statusEl.textContent = 'Updated ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + '.';
      render();
    } catch (e) {
      if (e.status === 401 || e.status === 429) return showLogin(e.message);
      statusEl.textContent = e.message;
    }
  }

  async function open(id) {
    selected = id;
    render();
    detail.textContent = '';
    detail.appendChild(el('p', 'quiet', 'Loading...'));
    try {
      var d = await api('/owner/enquiries/' + id);
      var rec = d.enquiry;
      var photos = [];
      if (rec.photos) photos = (await api('/owner/enquiries/' + id + '/photos')).photos || [];
      if (selected !== id) return;
      drawDetail(rec, photos);
    } catch (e) {
      if (e.status === 401 || e.status === 429) return showLogin(e.message);
      detail.textContent = '';
      detail.appendChild(el('p', 'quiet', e.message));
    }
  }

  function drawDetail(rec, photos) {
    detail.textContent = '';
    var box = el('div', 'sheet');
    var stripe = el('div', 'stripe'); stripe.setAttribute('aria-hidden', 'true');
    box.appendChild(stripe);
    var body = el('div', 'sheet-body');
    body.appendChild(el('h2', null, rec.name || 'Enquiry'));
    body.appendChild(el('p', 'sub', 'Received ' + when(rec.created) + (rec.status === 'handled' ? '. Marked as handled.' : '.')));
    var dl = el('dl', 'rows');
    rec.rows.forEach(function (r) {
      var row = el('div', 'row');
      row.appendChild(el('dt', null, r.label));
      var dd = el('dd');
      if (isBlank(r.value)) { dd.className = 'none'; dd.textContent = 'Not given'; }
      else if (r.label === 'Urgency') dd.appendChild(pill(rec.urgency));
      else dd.textContent = r.value;
      row.appendChild(dd);
      dl.appendChild(row);
    });
    body.appendChild(dl);
    if (photos.length) {
      body.appendChild(el('h3', 'ph-h', 'Photos from the customer'));
      var wrap = el('div', 'ph');
      photos.forEach(function (d) {
        var a = el('a'); a.href = d; a.target = '_blank'; a.rel = 'noopener';
        var im = el('img'); im.src = d; im.alt = 'Photo sent by the customer';
        a.appendChild(im); wrap.appendChild(a);
      });
      body.appendChild(wrap);
    }
    var next = rec.status === 'handled' ? 'new' : 'handled';
    var btn = el('button', 'btn', next === 'handled' ? 'Mark as handled' : 'Move back to new');
    btn.type = 'button';
    btn.addEventListener('click', async function () {
      btn.disabled = true;
      try {
        await api('/owner/enquiries/' + rec.id + '/status', { method: 'POST', body: { status: next } });
        await refresh(true);
        if (filter !== 'all') { detail.textContent = ''; selected = ''; render(); }
        else open(rec.id);
      } catch (e) {
        btn.disabled = false;
        statusEl.textContent = e.message;
      }
    });
    var act = el('div', 'actions'); act.appendChild(btn);
    body.appendChild(act);
    box.appendChild(body);
    detail.appendChild(box);
  }

  function enter() {
    login.hidden = true; inbox.hidden = false;
    detail.textContent = ''; selected = '';
    refresh(false);
    clearInterval(timer);
    timer = setInterval(function () { if (!document.hidden) refresh(true); }, 30000);
  }

  login.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!API) { loginMsg.textContent = "This demo isn't connected to its server yet."; return; }
    token = pass.value.trim();
    if (!token) return;
    loginMsg.textContent = 'Checking...';
    try {
      await api('/owner/enquiries');
      try { sessionStorage.setItem(KEY, token); } catch (err) { /* ignore */ }
      pass.value = '';
      loginMsg.textContent = '';
      enter();
    } catch (err) {
      token = '';
      loginMsg.textContent = err.message;
    }
  });

  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      filter = t.getAttribute('data-f');
      tabs.forEach(function (x) { x.setAttribute('aria-pressed', x === t ? 'true' : 'false'); });
      render();
    });
  });
  document.getElementById('refresh').addEventListener('click', function () { refresh(false); });
  document.getElementById('lock').addEventListener('click', function () { showLogin('Locked.'); });

  if (token && API) enter();
})();
