// Cloudflare Worker for the Sam's Electrical demo.
//   POST /chat    { messages, cid?, images?, trade? }  ->  { reply }   the customer chat (trade: 'electrician' by default, or 'handyman')
//   GET  /health  { ok: true }
//   Owner inbox (needs the OWNER_TOKEN passphrase as "Authorization: Bearer ..."):
//   GET  /owner/enquiries[?trade=handyman]  list of saved enquiries for one site
//   GET  /owner/enquiries/<id>           one enquiry
//   GET  /owner/enquiries/<id>/photos    its photos
//   POST /owner/enquiries/<id>/status    { status: 'new' | 'handled' }
// The instructions live in prompt.js and every key lives in a Worker secret, so none of them reach the browser.
import { PROMPT as ELECTRICIAN_PROMPT } from './prompt.js';
import { PROMPT as HANDYMAN_PROMPT } from './prompt-handyman.js';

const DEFAULT_MODEL = 'claude-sonnet-5-5';
const MAX_TEXT_BODY = 20000;         // bytes of request body when there are no photos
const MAX_BODY_WITH_IMAGES = 1000000;
const MAX_TURNS = 30;                // messages in one conversation
const MAX_USER_CHARS = 800;          // per customer message
const MAX_BOT_CHARS = 4000;          // per earlier assistant reply (includes the owner summary)
const MAX_OUTPUT_TOKENS = 700;
const MAX_IMAGES = 2;                // photos per message
const MAX_IMAGE_CHARS = 450000;      // per photo, as a data URL
const MAX_PHOTOS_STORED = 6;         // per enquiry
const KEEP_SECONDS = 30 * 24 * 3600; // enquiries and photos are deleted after 30 days
const MARK = '---OWNER SUMMARY---';
const FIELDS = ['Name', 'Phone', 'Address and postcode', 'Job type', 'Property type', 'Details', 'Urgency', 'Requested slot', 'Photos', 'Notes'];
const JPEG_PREFIX = 'data:image/jpeg;base64,';

// One Worker serves both demo websites. Each trade has its own instructions, greeting and wording.
const TRADES = {
  electrician: {
    prompt: ELECTRICIAN_PROMPT,
    greeting: "Hi, I'm Sam's AI assistant. Tell me what you need doing, or what has gone wrong, and I'll pass the details to Sam.",
    business: "Sam's Electrical",
    ownerPage: 'electrician/owner.html',
    fallbackJob: 'electrical job',
  },
  handyman: {
    prompt: HANDYMAN_PROMPT,
    greeting: "Hi, I'm Fraser's AI assistant. Tell me what needs doing and I'll pass the details to Fraser.",
    business: "Fraser's Handyman",
    ownerPage: 'handyman/owner.html',
    fallbackJob: 'handyman job',
  },
};
const tradeOf = (v) => (v === 'handyman' ? 'handyman' : 'electrician');

// Said to the model on every request, after the prompt. The page already shows a greeting, so the model skips its own.
const pageNote = (t) =>
  `The chat page has already greeted the customer with: '${TRADES[t].greeting}' Do not introduce yourself again. Go straight to helping with their message.`;

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';
    const allowedList = (env.ALLOWED_ORIGIN || '*').split(',').map((s) => s.trim()).filter(Boolean);
    const openToAll = allowedList.includes('*');
    const originOk = openToAll || allowedList.includes(origin);

    const cors = {
      'Access-Control-Allow-Origin': openToAll ? '*' : originOk ? origin : allowedList[0] || '',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, authorization',
      Vary: 'Origin',
    };
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!originOk) return json({ error: 'forbidden' }, 403);

    const ip = req.headers.get('CF-Connecting-IP') || 'unknown';

    if (url.pathname === '/health' && req.method === 'GET') return json({ ok: true });
    if (url.pathname.startsWith('/owner/')) return ownerRoutes(req, env, url, ip, json);
    if (url.pathname !== '/chat' || req.method !== 'POST') return json({ error: 'not_found' }, 404);

    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: 'not_configured', message: 'The demo server has no AI key yet.' }, 500);
    }

    const raw = await req.text();
    if (raw.length > MAX_BODY_WITH_IMAGES) return json({ error: 'too_large', message: 'That conversation is too long.' }, 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: 'bad_json' }, 400);
    }
    const images = cleanImages(body && body.images);
    if (!images) return json({ error: 'bad_image', message: 'That photo could not be used. Try a different one.' }, 400);
    if (!images.length && raw.length > MAX_TEXT_BODY) return json({ error: 'too_large', message: 'That conversation is too long.' }, 413);
    const messages = cleanMessages(body && body.messages);
    if (!messages) return json({ error: 'bad_messages' }, 400);
    const trade = tradeOf(body && body.trade);
    const cid = body && typeof body.cid === 'string' && /^[a-f0-9]{16,64}$/.test(body.cid) ? body.cid : null;

    const blocked = await overLimit(env, ip);
    if (blocked) return json({ error: 'limit', message: blocked }, 429);

    if (images.length) {
      const last = messages[messages.length - 1];
      last.content = [
        ...images.map((d) => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: d.slice(JPEG_PREFIX.length) } })),
        { type: 'text', text: last.content },
      ];
    }

    const system = `${TRADES[trade].prompt}\n\n${pageNote(trade)}\n\nCURRENT TIME\nIt is ${ukNow()} in the UK.`;
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

    // Save photos and the finished enquiry, and email Sam, without making the customer wait for it.
    if (cid && env.LIMITS) {
      const work = afterReply(env, cid, images, reply, trade).catch((e) => console.log('save failed', String(e)));
      if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(work);
      else await work;
    }
    return json({ reply });
  },
};

/* ---------- Request checks ---------- */

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

// Photos must be JPEG data URLs of a sensible size. Returns [] when there are none and null when something is wrong.
function cleanImages(input) {
  if (input == null) return [];
  if (!Array.isArray(input) || input.length > MAX_IMAGES) return null;
  for (const d of input) {
    if (typeof d !== 'string' || d.length > MAX_IMAGE_CHARS || d.length < JPEG_PREFIX.length + 100) return null;
    if (!d.startsWith(JPEG_PREFIX)) return null;
    if (!d.startsWith(JPEG_PREFIX + '/9j/')) return null; // JPEG files start with these bytes
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(d.slice(JPEG_PREFIX.length))) return null;
  }
  return input;
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

/* ---------- Saving enquiries ---------- */

function isBlank(v) {
  return !v || /^[([][^)\]]*[)\]]$/.test(v) || /^(n\/a|not given|not provided|unknown|-+)\.?$/i.test(v);
}

function parseSummary(reply) {
  const i = reply.indexOf(MARK);
  if (i < 0) return null;
  const rows = [];
  let cur = null;
  for (const raw of reply.slice(i + MARK.length).split('\n')) {
    const line = raw.replace(/[*`]/g, '').trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z][A-Za-z ]*?):\s*(.*)$/);
    const label = m && FIELDS.find((f) => f.toLowerCase() === m[1].trim().toLowerCase());
    if (label) {
      cur = { label, value: m[2].trim().slice(0, 600) };
      rows.push(cur);
    } else if (cur) cur.value = `${cur.value} ${line}`.trim().slice(0, 600);
  }
  return rows.length ? rows : null;
}

function urgencyOf(rows) {
  const v = ((rows.find((r) => r.label === 'Urgency') || {}).value || '').toUpperCase();
  return v.includes('EMERGENCY') ? 'emergency' : v.includes('URGENT') ? 'urgent' : 'routine';
}

const valueOf = (rows, label) => {
  const v = (rows.find((r) => r.label === label) || {}).value || '';
  return isBlank(v) ? '' : v;
};

const oneLine = (v, n) => String(v ?? '').replace(/[\r\n]+/g, ' ').slice(0, n);

async function afterReply(env, cid, images, reply, trade) {
  if (images.length) {
    const key = `pic:${cid}`;
    let have = [];
    try { have = JSON.parse((await env.LIMITS.get(key)) || '[]'); } catch { have = []; }
    have = [...have, ...images].slice(-MAX_PHOTOS_STORED);
    await env.LIMITS.put(key, JSON.stringify(have), { expirationTtl: KEEP_SECONDS });
  }
  const rows = parseSummary(reply);
  if (!rows) return;
  if (!rows.some((r) => !isBlank(r.value) && ['Name', 'Phone', 'Details', 'Job type'].includes(r.label))) return;

  const key = `enq:${cid}`;
  let existing = null;
  try { existing = JSON.parse((await env.LIMITS.get(key)) || 'null'); } catch { existing = null; }
  let photos = 0;
  try { photos = JSON.parse((await env.LIMITS.get(`pic:${cid}`)) || '[]').length; } catch { photos = 0; }

  const now = new Date().toISOString();
  const rec = {
    id: cid,
    trade,
    created: existing ? existing.created : now,
    updated: now,
    status: existing ? existing.status : 'new',
    rows,
    urgency: urgencyOf(rows),
    name: oneLine(valueOf(rows, 'Name'), 60),
    job: oneLine(valueOf(rows, 'Job type'), 60),
    photos,
  };
  await putEnquiry(env, rec);
  if (!existing) {
    await notifySam(env, rec);
    await notifyPush(env, rec);
  }
}

const metaOf = (r) => ({ n: r.name, j: r.job, u: r.urgency, s: r.status, c: r.created, up: r.updated, p: r.photos, t: r.trade || 'electrician' });
const putEnquiry = (env, rec) =>
  env.LIMITS.put(`enq:${rec.id}`, JSON.stringify(rec), { expirationTtl: KEEP_SECONDS, metadata: metaOf(rec) });

/* ---------- Instant phone alert (ntfy) ---------- */

// A push to the owner's phone through the free ntfy app. The topic name acts as the password, so it must be long and random.
// Only the job type and urgency are sent, never the customer's name, address or phone number: the details stay in the inbox.
// NTFY_TOPIC is used for every trade; NTFY_TOPIC_HANDYMAN (optional) overrides it for the handyman site. NTFY_SERVER defaults to https://ntfy.sh.
async function notifyPush(env, rec) {
  const t = TRADES[rec.trade] ? rec.trade : 'electrician';
  const topic = String((t === 'handyman' && env.NTFY_TOPIC_HANDYMAN) || env.NTFY_TOPIC || '').trim();
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(topic)) return;
  const day = new Date().toISOString().slice(0, 10);
  const capKey = `push:${day}`;
  const used = Number((await env.LIMITS.get(capKey)) || 0);
  if (used >= (Number(env.PUSH_DAILY_CAP) || 50)) return;
  await env.LIMITS.put(capKey, String(used + 1), { expirationTtl: 172800 });

  const label = { emergency: 'EMERGENCY', urgent: 'Urgent', routine: 'Routine' }[rec.urgency] || 'Routine';
  const headers = {
    Title: `New enquiry (${label})`,
    Priority: rec.urgency === 'emergency' ? '5' : rec.urgency === 'urgent' ? '4' : '3',
    Tags: rec.urgency === 'emergency' ? 'rotating_light' : rec.urgency === 'urgent' ? 'warning' : 'wrench',
  };
  const link = ownerUrl(env, t);
  if (/^https:\/\/[\x21-\x7e]+$/.test(link)) headers.Click = link;
  const server = /^https:\/\/[A-Za-z0-9.-]+$/.test(env.NTFY_SERVER || '') ? env.NTFY_SERVER : 'https://ntfy.sh';
  const body = oneLine(`${rec.job || TRADES[t].fallbackJob}${rec.photos ? ` (${rec.photos} photo${rec.photos > 1 ? 's' : ''})` : ''}. Open the inbox for the details.`, 160);
  try {
    await fetch(`${server}/${topic}`, { method: 'POST', headers, body });
  } catch (e) {
    console.log('push failed', String(e));
  }
}

/* ---------- Email to Sam ---------- */

// The inbox page sits beside the website, so the address can be worked out from the allowed site address unless OWNER_URL says otherwise.
// OWNER_URL, if set, is the electrician inbox address; the handyman inbox sits in the neighbouring folder.
function ownerUrl(env, trade) {
  if (env.OWNER_URL) return trade === 'handyman' ? env.OWNER_URL.replace('/electrician/', '/handyman/') : env.OWNER_URL;
  const first = (env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).find((s) => /^https:\/\//.test(s));
  return first ? `${first}/handyman-demo/${TRADES[trade].ownerPage}` : '';
}

// Sent through a small Google Apps Script that uses a Gmail account (see mail-relay.gs). Off until all three settings exist.
async function notifySam(env, rec) {
  if (!env.MAIL_WEBHOOK_URL || !env.MAIL_SECRET || !env.SAM_EMAIL) return;
  const day = new Date().toISOString().slice(0, 10);
  const capKey = `mail:${day}`;
  const used = Number((await env.LIMITS.get(capKey)) || 0);
  if (used >= (Number(env.EMAIL_DAILY_CAP) || 20)) return;
  await env.LIMITS.put(capKey, String(used + 1), { expirationTtl: 172800 });

  const t = TRADES[rec.trade] ? rec.trade : 'electrician';
  const T = TRADES[t];
  const label = { emergency: 'EMERGENCY', urgent: 'Urgent', routine: 'Routine' }[rec.urgency];
  const lines = rec.rows.map((r) => `${r.label}: ${isBlank(r.value) ? 'Not given' : r.value}`);
  const text =
    `A customer finished a chat on the ${T.business} demo website.\n\n` +
    lines.join('\n') +
    (rec.photos ? `\n\nPhotos: ${rec.photos} attached in your inbox` : '') +
    (ownerUrl(env, t) ? `\n\nOpen your inbox: ${ownerUrl(env, t)}` : '') +
    '\n\nThis is a demo. Nothing is booked until the owner confirms with the customer.\n';
  const subject = oneLine(`New enquiry (${label}): ${rec.job || T.fallbackJob}${rec.name ? ' from ' + rec.name : ''}`, 120);
  try {
    await fetch(env.MAIL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: env.MAIL_SECRET, to: env.SAM_EMAIL, subject, text, name: `${T.business} enquiries (demo)` }),
      redirect: 'follow',
    });
  } catch (e) {
    console.log('mail failed', String(e));
  }
}

/* ---------- Owner inbox ---------- */

async function sameSecret(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const xa = new Uint8Array(x), ya = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < xa.length; i++) diff |= xa[i] ^ ya[i];
  return diff === 0;
}

async function ownerRoutes(req, env, url, ip, json) {
  if (!env.OWNER_TOKEN || !env.LIMITS) return json({ error: 'not_configured', message: 'The owner inbox is not set up yet.' }, 503);

  const hour = new Date().toISOString().slice(0, 13);
  const failKey = `fail:${ip}:${hour}`;
  const fails = Number((await env.LIMITS.get(failKey)) || 0);
  if (fails >= 10) return json({ error: 'locked', message: 'Too many wrong attempts. Try again in an hour.' }, 429);

  const auth = req.headers.get('Authorization') || '';
  const given = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!given || !(await sameSecret(given, env.OWNER_TOKEN))) {
    await env.LIMITS.put(failKey, String(fails + 1), { expirationTtl: 7200 });
    return json({ error: 'unauthorised', message: 'That passphrase is not right.' }, 401);
  }

  const path = url.pathname.replace(/\/+$/, '');
  if (path === '/owner/enquiries' && req.method === 'GET') {
    const want = tradeOf(url.searchParams.get('trade'));
    const listing = await env.LIMITS.list({ prefix: 'enq:', limit: 200 });
    const items = listing.keys
      .filter((k) => ((k.metadata || {}).t || 'electrician') === want)
      .map((k) => {
        const m = k.metadata || {};
        return { id: k.name.slice(4), name: m.n || '', job: m.j || '', urgency: m.u || 'routine', status: m.s || 'new', created: m.c || '', updated: m.up || '', photos: m.p || 0 };
      })
      .sort((a, b) => (a.created < b.created ? 1 : -1));
    return json({ items });
  }

  const m = path.match(/^\/owner\/enquiries\/([a-f0-9]{16,64})(\/photos|\/status)?$/);
  if (!m) return json({ error: 'not_found' }, 404);
  const id = m[1];
  const key = `enq:${id}`;

  if (m[2] === '/photos' && req.method === 'GET') {
    let photos = [];
    try { photos = JSON.parse((await env.LIMITS.get(`pic:${id}`)) || '[]'); } catch { photos = []; }
    return json({ photos });
  }

  let rec = null;
  try { rec = JSON.parse((await env.LIMITS.get(key)) || 'null'); } catch { rec = null; }
  if (!rec) return json({ error: 'not_found' }, 404);

  if (!m[2] && req.method === 'GET') return json({ enquiry: rec });

  if (m[2] === '/status' && req.method === 'POST') {
    let b;
    try { b = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
    if (!b || (b.status !== 'new' && b.status !== 'handled')) return json({ error: 'bad_status' }, 400);
    rec.status = b.status;
    await putEnquiry(env, rec);
    return json({ ok: true, status: rec.status });
  }
  return json({ error: 'not_found' }, 404);
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
