(function () {
  'use strict';

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.getElementById('menu');
  var nav = document.getElementById('nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------- Site-wide assistant ---------- */
  var API = String(window.SAM_API || '').replace(/\/$/, '');
  var KEY = 'sam.chat.v1';
  var GREETING = "Hi, I'm Sam's AI assistant. Tell me what you need doing, or what has gone wrong, and I'll pass the details to Sam.";
  var STARTERS = ['My breaker keeps tripping', 'I want an EV charger fitted', 'Half my house has no power', 'I can smell burning from my fuse box'];
  var MARK = '---OWNER SUMMARY---';
  var FIELDS = ['Name', 'Phone', 'Address and postcode', 'Job type', 'Property type', 'Details', 'Urgency', 'Requested slot', 'Photos', 'Notes'];
  var MAX_TURNS = 28;

  var turns = [];   // what the server sees
  var view = [];    // what the visitor sees: {k:'bot'|'me'|'problem'|'sheet', t, rows}
  var isOpen = false;
  var busy = false, ctl = null, gen = 0;

  function load() {
    try {
      var s = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (s && Array.isArray(s.turns) && Array.isArray(s.view)) { turns = s.turns; view = s.view; isOpen = !!s.open; }
    } catch (e) { /* storage blocked: start fresh */ }
  }
  function save() {
    try { sessionStorage.setItem(KEY, JSON.stringify({ turns: turns, view: view, open: isOpen })); } catch (e) { /* ignore */ }
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  // **bold** only, never HTML
  function richText(node, text) {
    String(text).split('**').forEach(function (p, i) {
      if (!p) return;
      if (i % 2 === 1) { var b = document.createElement('strong'); b.textContent = p; node.appendChild(b); }
      else node.appendChild(document.createTextNode(p));
    });
  }

  function splitReply(reply) {
    var i = reply.indexOf(MARK);
    if (i < 0) return { text: reply.trim(), rows: null };
    var rows = parseSummary(reply.slice(i + MARK.length));
    return { text: reply.slice(0, i).trim(), rows: rows.length ? rows : null };
  }
  function parseSummary(block) {
    var rows = [], cur = null;
    block.split('\n').forEach(function (raw) {
      var line = raw.replace(/[*`]/g, '').trim();
      if (!line) return;
      var m = line.match(/^([A-Za-z][A-Za-z ]*?):\s*(.*)$/);
      var label = m && FIELDS.filter(function (f) { return f.toLowerCase() === m[1].trim().toLowerCase(); })[0];
      if (label) { cur = { label: label, value: m[2].trim() }; rows.push(cur); }
      else if (cur) cur.value = (cur.value + ' ' + line).trim();
    });
    return rows;
  }
  function isBlank(v) { return !v || /^[\(\[][^\)\]]*[\)\]]$/.test(v) || /^(n\/a|not given|not provided|unknown|-+)\.?$/i.test(v); }

  function sheetNode(rows) {
    var box = el('aside', 'sheet as-sheet');
    box.setAttribute('aria-label', 'Job sheet sent to Sam');
    var stripe = el('div', 'stripe'); stripe.setAttribute('aria-hidden', 'true');
    box.appendChild(stripe);
    var body = el('div', 'sheet-body');
    body.appendChild(el('h3', null, 'Job sheet for Sam'));
    body.appendChild(el('p', 'sub', 'This is what Sam receives on his phone.'));
    var dl = el('dl', 'rows');
    rows.forEach(function (r) {
      var row = el('div', 'row');
      row.appendChild(el('dt', null, r.label));
      var dd = el('dd');
      if (isBlank(r.value)) { dd.className = 'none'; dd.textContent = 'Not given'; }
      else if (r.label === 'Urgency') {
        var up = r.value.toUpperCase();
        var u = up.indexOf('EMERGENCY') > -1 ? 'emergency' : up.indexOf('URGENT') > -1 ? 'urgent' : 'routine';
        dd.appendChild(el('span', 'pill ' + u, u.charAt(0).toUpperCase() + u.slice(1)));
      } else dd.textContent = r.value;
      row.appendChild(dd);
      dl.appendChild(row);
    });
    body.appendChild(dl);
    box.appendChild(body);
    return box;
  }

  /* DOM */
  var launch, panel, logEl, chipsEl, form, input, sendBtn, closeBtn, restartBtn;

  function build() {
    launch = el('button', 'as-launch');
    launch.type = 'button';
    launch.setAttribute('aria-expanded', 'false');
    launch.setAttribute('aria-controls', 'as-panel');
    launch.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg><span>Ask Sam\'s assistant</span>';

    panel = el('section', 'as-panel');
    panel.id = 'as-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', "Chat with Sam's assistant");

    var top = el('div', 'as-top');
    top.appendChild(el('strong', null, "Sam's assistant"));
    restartBtn = el('button', null, 'Start again'); restartBtn.type = 'button';
    closeBtn = el('button', null, 'Close'); closeBtn.type = 'button';
    top.appendChild(restartBtn); top.appendChild(closeBtn);

    var note = el('p', 'as-note', "AI assistant for a demo business. Please don't enter real personal details. For fire, smoke or a shock, call 999.");

    logEl = el('div', 'as-log'); logEl.setAttribute('role', 'log'); logEl.setAttribute('aria-live', 'polite'); logEl.setAttribute('aria-relevant', 'additions');
    chipsEl = el('div', 'as-chips');

    form = el('form', 'as-form'); form.setAttribute('autocomplete', 'off');
    var lab = el('label', 'sr', 'Your message'); lab.setAttribute('for', 'as-msg');
    input = el('textarea'); input.id = 'as-msg'; input.rows = 1; input.maxLength = 600; input.placeholder = 'Describe the job or the problem';
    sendBtn = el('button', 'as-send', 'Send'); sendBtn.type = 'submit';
    form.appendChild(lab); form.appendChild(input); form.appendChild(sendBtn);

    panel.appendChild(top); panel.appendChild(note); panel.appendChild(logEl); panel.appendChild(chipsEl); panel.appendChild(form);
    document.body.appendChild(launch);
    document.body.appendChild(panel);
  }

  function scrollDown() { logEl.scrollTop = logEl.scrollHeight; }

  function drawItem(it) {
    if (it.k === 'sheet') logEl.appendChild(sheetNode(it.rows));
    else {
      var m = el('div', 'msg ' + it.k);
      if (it.k === 'bot') richText(m, it.t); else m.textContent = it.t;
      logEl.appendChild(m);
    }
  }
  function add(item) { view.push(item); drawItem(item); scrollDown(); save(); }

  function drawChips() {
    chipsEl.textContent = '';
    if (turns.length) return;
    STARTERS.forEach(function (s) {
      var b = el('button', 'chip', s); b.type = 'button';
      b.addEventListener('click', function () { send(s); });
      chipsEl.appendChild(b);
    });
  }

  function redraw() {
    logEl.textContent = '';
    view.forEach(drawItem);
    drawChips();
    var full = turns.length >= MAX_TURNS;
    input.disabled = full; sendBtn.disabled = full;
    scrollDown();
  }

  function setBusy(on) {
    busy = on;
    sendBtn.disabled = on;
    input.disabled = on || turns.length >= MAX_TURNS;
    if (!on && !input.disabled && isOpen) input.focus({ preventScroll: true });
  }

  function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; }

  function open(focus) {
    isOpen = true;
    panel.hidden = false; launch.hidden = true;
    launch.setAttribute('aria-expanded', 'true');
    if (!view.length) add({ k: 'bot', t: GREETING });
    redraw();
    if (focus !== false) input.focus({ preventScroll: true });
    save();
  }
  function close() {
    isOpen = false;
    panel.hidden = true; launch.hidden = false;
    launch.setAttribute('aria-expanded', 'false');
    var back = launch.offsetParent ? launch : document.querySelector('.mbar [data-open]');
    if (back) back.focus({ preventScroll: true });
    save();
  }

  function reset() {
    gen++;
    if (ctl) ctl.abort();
    turns = []; view = []; busy = false;
    input.value = ''; autosize();
    add({ k: 'bot', t: GREETING });
    redraw();
    input.disabled = false; sendBtn.disabled = false;
    input.focus({ preventScroll: true });
  }

  async function send(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    if (!isOpen) open(false);
    if (!API) { add({ k: 'me', t: text }); add({ k: 'problem', t: "This demo isn't connected to its server yet." }); input.value = ''; autosize(); return; }
    chipsEl.textContent = '';
    add({ k: 'me', t: text });
    turns.push({ role: 'user', content: text });
    input.value = ''; autosize();
    setBusy(true);
    var typing = el('div', 'msg bot typing');
    typing.setAttribute('aria-label', 'The assistant is typing');
    typing.appendChild(el('i')); typing.appendChild(el('i')); typing.appendChild(el('i'));
    logEl.appendChild(typing); scrollDown();
    var mine = gen;
    ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, 45000);
    try {
      var res = await fetch(API + '/chat', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: turns }), signal: ctl.signal
      });
      var data = {};
      try { data = await res.json(); } catch (e) { /* not JSON */ }
      if (mine !== gen) return;
      typing.remove();
      if (!res.ok || !data.reply) {
        turns.pop();
        add({ k: 'problem', t: data.message || (res.status === 429 ? 'The demo is busy. Please try again in a little while.' : 'Something went wrong on the server. Your message was not sent, so try again.') });
      } else {
        var parts = splitReply(data.reply);
        turns.push({ role: 'assistant', content: data.reply });
        if (parts.text) add({ k: 'bot', t: parts.text });
        if (parts.rows) add({ k: 'sheet', rows: parts.rows });
        save();
      }
    } catch (err) {
      if (mine !== gen) return;
      typing.remove();
      turns.pop();
      add({ k: 'problem', t: err && err.name === 'AbortError'
        ? 'The assistant took too long to answer. Your message was not sent, so try again.'
        : "Can't reach the demo server. Check your connection, then try again." });
    } finally {
      clearTimeout(timer);
      if (mine === gen) setBusy(false);
      if (mine === gen && turns.length >= MAX_TURNS) {
        input.disabled = true; sendBtn.disabled = true;
        add({ k: 'problem', t: 'This chat has reached the demo limit. Select Start again to begin a new one.' });
      }
    }
  }

  function init() {
    load();
    build();
    launch.addEventListener('click', function () { open(true); });
    closeBtn.addEventListener('click', close);
    restartBtn.addEventListener('click', reset);
    form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
    input.addEventListener('input', autosize);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(input.value); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) close(); });
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-ask], [data-open]');
      if (!t) return;
      e.preventDefault();
      if (menuBtn && nav && nav.classList.contains('open')) { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }
      var ask = t.getAttribute('data-ask');
      if (ask) { open(false); send(ask); } else open(true);
    });
    // Carry an open chat across pages, but not on phones where it would cover the new page.
    if (isOpen && view.length && window.matchMedia('(min-width: 601px)').matches) open(false);
    else { isOpen = false; save(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
