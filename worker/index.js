// Cloudflare Worker for the handyman demo.
//   POST /chat   forwards a chat request to Claude (if ANTHROPIC_API_KEY is set) or Groq. Keys stay here.
//   GET  /state  returns the shared schedule
//   POST /op     sets or deletes one booking, block or the working hours
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
  const body = { model: env.CLAUDE_MODEL || CLAUDE_MODEL, max_tokens: 600, temperature: 0.3, system, messages: msgs };
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
