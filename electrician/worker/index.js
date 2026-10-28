// Cloudflare Worker for the Sam's Electrical demo.
//   POST /chat    { messages: [{ role: 'user' | 'assistant', content: '...' }] }  ->  { reply: '...' }
//   GET  /health  { ok: true }
// The instructions live in prompt.js and the Claude key lives in a Worker secret, so neither reaches the browser.
import { PROMPT } from './prompt.js';

const DEFAULT_MODEL = 'claude-sonnet-5-5';
const MAX_BODY = 20000;      // bytes of request body
const MAX_TURNS = 30;        // messages in one conversation
const MAX_USER_CHARS = 800;  // per customer message
const MAX_BOT_CHARS = 4000;  // per earlier assistant reply (includes the owner summary)
const MAX_OUTPUT_TOKENS = 700;

// Said to the model on every request, after the prompt. The page already shows a greeting, so the model skips its own.
const PAGE_NOTE =
  "The chat page has already greeted the customer with: 'Hi, I'm Sam's AI assistant. Tell me what you need doing, or what has gone wrong, and I'll pass the details to Sam.' Do not introduce yourself again. Go straight to helping with their message.";

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';
    const allowedList = (env.ALLOWED_ORIGIN || '*').split(',').map((s) => s.trim()).filter(Boolean);
    const openToAll = allowedList.includes('*');
    const originOk = openToAll || allowedList.includes(origin);

    const cors = {
      'Access-Control-Allow-Origin': openToAll ? '*' : originOk ? origin : allowedList[0] || '',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      Vary: 'Origin',
    };
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!originOk) return json({ error: 'forbidden' }, 403);

    if (url.pathname === '/health' && req.method === 'GET') return json({ ok: true });
    if (url.pathname !== '/chat' || req.method !== 'POST') return json({ error: 'not_found' }, 404);

    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: 'not_configured', message: 'The demo server has no AI key yet.' }, 500);
    }

    const raw = await req.text();
    if (raw.length > MAX_BODY) return json({ error: 'too_large', message: 'That conversation is too long.' }, 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: 'bad_json' }, 400);
    }
    const messages = cleanMessages(body && body.messages);
    if (!messages) return json({ error: 'bad_messages' }, 400);

    const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
    const blocked = await overLimit(env, ip);
    if (blocked) return json({ error: 'limit', message: blocked }, 429);

    const system = `${PROMPT}\n\n${PAGE_NOTE}\n\nCURRENT TIME\nIt is ${ukNow()} in the UK.`;
    let upstream;
    try {
      upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: env.CLAUDE_MODEL || DEFAULT_MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
          system,
          messages,
        }),
      });
    } catch (err) {
      console.log('upstream fetch failed', String(err));
      return json({ error: 'upstream', message: 'The assistant could not be reached. Try again in a minute.' }, 502);
    }
    if (!upstream.ok) {
      console.log('upstream status', upstream.status);
      return json({ error: 'upstream', message: 'The assistant is unavailable right now. Try again in a minute.' }, 502);
    }
    const data = await upstream.json();
    const reply = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    if (!reply) return json({ error: 'empty', message: 'The assistant sent an empty reply. Try again.' }, 502);
    return json({ reply });
  },
};

// Accepts only a plain alternating user/assistant conversation that starts and ends with the customer.
function cleanMessages(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_TURNS) return null;
  const out = [];
  for (let i = 0; i < input.length; i++) {
    const m = input[i];
    if (!m || typeof m.content !== 'string') return null;
    const role = m.role;
    if (role !== 'user' && role !== 'assistant') return null;
    if (role !== (i % 2 === 0 ? 'user' : 'assistant')) return null;
    const content = m.content.trim();
    if (!content) return null;
    if (content.length > (role === 'user' ? MAX_USER_CHARS : MAX_BOT_CHARS)) return null;
    out.push({ role, content });
  }
  if (out[out.length - 1].role !== 'user') return null;
  return out;
}

// Per-visitor hourly limit and a daily limit for the whole demo. Needs the LIMITS KV namespace; without it, no limits apply.
async function overLimit(env, ip) {
  if (!env.LIMITS) return null;
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const hour = now.toISOString().slice(0, 13);
  const hourlyCap = Number(env.HOURLY_CAP) || 40;
  const dailyCap = Number(env.DAILY_CAP) || 400;
  const ipKey = `ip:${ip}:${hour}`;
  const dayKey = `day:${day}`;
  const [ipCount, dayCount] = await Promise.all([env.LIMITS.get(ipKey), env.LIMITS.get(dayKey)]);
  if (Number(dayCount || 0) >= dailyCap) return 'The demo has reached its limit for today. Please try again tomorrow.';
  if (Number(ipCount || 0) >= hourlyCap) return 'You have sent a lot of messages. Please wait a little while and try again.';
  await Promise.all([
    env.LIMITS.put(ipKey, String(Number(ipCount || 0) + 1), { expirationTtl: 7200 }),
    env.LIMITS.put(dayKey, String(Number(dayCount || 0) + 1), { expirationTtl: 172800 }),
  ]);
  return null;
}

function ukNow() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}
