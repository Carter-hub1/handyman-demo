// Cloudflare Worker for the handyman demo.
//   POST /chat   forwards a chat request to Claude (if ANTHROPIC_API_KEY is set) or Groq. Keys stay here.
//   GET  /state  returns the shared schedule
//   POST /op     sets or deletes one booking, block or the working hours
//   POST /notify emails the booking confirmation (only if MAIL_WEBHOOK_URL and MAIL_SECRET are set)
const MODEL = 'llama-3.3-70b-versatile';
const CLAUDE_MODEL = 'claude-haiku-5-5';
const KINDS = { bookings: 500, blocks: 200 };

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN || '*';
    const cors = {
      'Access-Control-Allow-Origin': allowed === '*' ? '*' : allowed,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      'Vary': 'Origin',
    };
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (allowed !== '*' && origin !== allowed) return json({ error: 'forbidden' }, 403);

    const load = async () => (await env.STATE.get('state', 'json')) || { bookings: {}, blocks: {} };

    if (url.pathname === '/state' && req.method === 'GET') return json(await load());

    if (url.pathname === '/op' && req.method === 'POST') {
      const raw = await req.text();
      if (raw.length > 8000) return json({ error: 'too large' }, 413);
      let b;
      try { b = JSON.parse(raw); } catch { return json({ error: 'bad json' }, 400); }
      const { kind, id, data } = b;
      if (typeof id !== 'string' || !/^[\w.-]{1,60}$/.test(id)) return json({ error: 'bad id' }, 400);
      const state = await load();
      if (kind === 'settings') {
        if (id !== 'hours') return json({ error: 'bad id' }, 400);
        if (data) state.hours = data;
      } else if (kind in KINDS) {
        if (data) {
          if (!state[kind][id] && Object.keys(state[kind]).length >= KINDS[kind]) return json({ error: 'full' }, 409);
          state[kind][id] = data;
        } else delete state[kind][id];
      } else return json({ error: 'bad kind' }, 400);
      await env.STATE.put('state', JSON.stringify(state));
      return json({ ok: true });
    }

    if (url.pathname === '/chat' && req.method === 'POST') {
      const raw = await req.text();
      if (raw.length > 60000) return json({ error: 'too large' }, 413);
      let b;
      try { b = JSON.parse(raw); } catch { return json({ error: 'bad json' }, 400); }
      if (!Array.isArray(b.messages) || b.messages.length > 80) return json({ error: 'bad messages' }, 400);
      const tools = Array.isArray(b.tools) ? b.tools.slice(0, 10) : undefined;
      const useClaude = !!env.ANTHROPIC_API_KEY && env.PROVIDER !== 'groq';
      if (useClaude) return claudeChat(b.messages, tools, env, json);
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + env.GROQ_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: env.MODEL || MODEL,
          messages: b.messages,
          tools,
          tool_choice: tools ? 'auto' : undefined,
          temperature: 0.3,
          max_tokens: 500,
        }),
      });
      return new Response(await r.text(), { status: r.status, headers: { ...cors, 'content-type': 'application/json' } });
    }

    if (url.pathname === '/notify' && req.method === 'POST') {
      if (!env.MAIL_WEBHOOK_URL || !env.MAIL_SECRET) return json({ sent: false, reason: 'email not configured' });
      const raw = await req.text();
      if (raw.length > 4000) return json({ error: 'too large' }, 413);
      let b;
      try { b = JSON.parse(raw); } catch { return json({ error: 'bad json' }, 400); }
      const k = b.booking || {};
      const ok = typeof b.id === 'string' && /^[\w.-]{1,60}$/.test(b.id)
        && /^\d{4}-\d{2}-\d{2}$/.test(k.date || '') && Number.isFinite(k.start) && Number.isFinite(k.dur)
        && /^[^\s@]{1,64}@[^\s@]{1,100}\.[^\s@]{2,20}$/.test(k.email || '');
      if (!ok) return json({ sent: false, reason: 'bad booking' }, 400);
      if (await env.STATE.get('mailed:' + b.id)) return json({ sent: false, reason: 'already sent' });
      const day = new Date().toISOString().slice(0, 10);
      const cap = Number(env.EMAIL_DAILY_CAP) || 20;
      const used = Number(await env.STATE.get('mailcount:' + day)) || 0;
      const need = env.KEITH_EMAIL ? 2 : 1;
      if (used + need > cap) return json({ sent: false, reason: 'daily limit reached' });
      await env.STATE.put('mailcount:' + day, String(used + need), { expirationTtl: 172800 });
      const when = fmtDate(k.date) + ', ' + fmtTime(k.start) + ' to ' + fmtTime(k.start + k.dur);
      const clean = (v, n) => String(v ?? '').replace(/[\r\n]+/g, ' ').slice(0, n);
      const sent = await sendMail(env, k.email, 'Your booking with Keith\'s Handyman Services (' + clean(k.ref, 12) + ')',
        'Hi ' + clean(k.name, 80) + ',\n\nYour booking with Keith\'s Handyman Services is confirmed.\n\n'
        + 'Service: ' + clean(k.serviceName, 80) + '\nWhen: ' + when + '\nWhere: ' + clean(k.address, 160) + '\nReference: ' + clean(k.ref, 12)
        + '\n\nTo change or cancel, message the chat on the website with your reference.\n\nThis is a demo booking. No visit will take place.\n');
      if (!sent) return json({ sent: false, reason: 'mail service failed' }, 502);
      await env.STATE.put('mailed:' + b.id, '1', { expirationTtl: 604800 });
      if (env.KEITH_EMAIL) {
        await sendMail(env, env.KEITH_EMAIL, 'New booking: ' + clean(k.name, 60) + ', ' + fmtDate(k.date) + ' ' + fmtTime(k.start),
          'New demo booking\n\nCustomer: ' + clean(k.name, 80) + '\nPhone: ' + clean(k.phone, 40) + '\nEmail: ' + k.email
          + '\nService: ' + clean(k.serviceName, 80) + '\nWhen: ' + when + '\nWhere: ' + clean(k.address, 160)
          + '\nNotes: ' + clean(k.notes, 300) + '\nReference: ' + clean(k.ref, 12) + '\n');
      }
      return json({ sent: true });
    }

    return json({ error: 'not found' }, 404);
  },
};

// The page speaks the OpenAI chat format. These two helpers translate it for Claude's Messages API.
function toAnthropic(messages) {
  let system = '';
  const out = [];
  for (const m of messages) {
    if (m.role === 'system') { system += (system ? '\n\n' : '') + String(m.content || ''); continue; }
    if (m.role === 'tool') {
      const block = { type: 'tool_result', tool_use_id: m.tool_call_id, content: String(m.content ?? '') };
      const last = out[out.length - 1];
      if (last && last.role === 'user' && Array.isArray(last.content) && last.content.every(c => c.type === 'tool_result')) last.content.push(block);
      else out.push({ role: 'user', content: [block] });
      continue;
    }
    if (m.role === 'assistant') {
      const content = [];
      if (m.content) content.push({ type: 'text', text: String(m.content) });
      for (const tc of m.tool_calls || []) {
        let input = {};
        try { input = JSON.parse(tc.function.arguments || '{}'); } catch {}
        content.push({ type: 'tool_use', id: tc.id, name: tc.function.name, input });
      }
      if (content.length) out.push({ role: 'assistant', content });
      continue;
    }
    out.push({ role: 'user', content: String(m.content || '') });
  }
  return { system, messages: out };
}

async function claudeChat(messages, tools, env, json) {
  const { system, messages: msgs } = toAnthropic(messages);
  const body = { model: env.CLAUDE_MODEL || CLAUDE_MODEL, max_tokens: 600, system, messages: msgs };
  if (tools && tools.length) {
    body.tools = tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters || { type: 'object', properties: {} },
    }));
  }
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return json(data, r.status);
  let text = '';
  const tool_calls = [];
  for (const c of data.content || []) {
    if (c.type === 'text') text += c.text;
    else if (c.type === 'tool_use') tool_calls.push({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.input || {}) } });
  }
  const message = { role: 'assistant', content: text || null };
  if (tool_calls.length) message.tool_calls = tool_calls;
  return json({ choices: [{ message }] });
}

// Email goes through a small Google Apps Script that sends from the owner's Gmail (see mail-relay.gs).
async function sendMail(env, to, subject, text) {
  try {
    const r = await fetch(env.MAIL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: env.MAIL_SECRET, to, subject, text }),
      redirect: 'follow',
    });
    return r.ok && (await r.text()).trim() === 'ok';
  } catch { return false; }
}
const fmtTime = m => `${Math.floor(m / 60) % 12 || 12}:${String(m % 60).padStart(2, '0')} ${Math.floor(m / 60) >= 12 ? 'pm' : 'am'}`;
const fmtDate = d => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
