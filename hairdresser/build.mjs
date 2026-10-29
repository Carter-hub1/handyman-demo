import fs from 'node:fs';
const OUT = '/home/claude/handyman-demo/hairdresser/';
const V = '1';
const PHONE = '01506 000 321';
const TEL = '01506000321';
const MAIL = 'hello@example.com';
const NAME = 'Willow Lane';

const logo = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22C12 14 12 9 12 3" stroke="#173A2E" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M12 8C8 8 5 6 4 3c4 0 7 1.5 8 5z" fill="#8FB59A"/><path d="M12 12c4 0 7-2 8-5-4 0-7 1.5-8 5z" fill="#7B2A5E"/><path d="M12 17c-3.5 0-6-1.7-7-4.5 3.5 0 6 1.4 7 4.5z" fill="#8FB59A"/></svg>`;
const favicon = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 8C8 8 5 6 4 3c4 0 7 1.5 8 5z' fill='%238FB59A'/%3E%3Cpath d='M12 12c4 0 7-2 8-5-4 0-7 1.5-8 5z' fill='%237B2A5E'/%3E%3Cpath d='M12 17c-3.5 0-6-1.7-7-4.5 3.5 0 6 1.4 7 4.5z' fill='%238FB59A'/%3E%3Cpath d='M12 22C12 14 12 9 12 3' stroke='%23173A2E' stroke-width='1.6' stroke-linecap='round' fill='none'/%3E%3C/svg%3E`;

const NAV = [
  ['index.html', 'Home', './'],
  ['services.html', 'Services and prices', 'services.html'],
  ['visit.html', 'Visit us', 'visit.html'],
  ['faqs.html', 'FAQs', 'faqs.html'],
];

function page({ file, title, desc, body, bare = false }) {
  const nav = NAV.map(([f, label, href]) => `<a href="${href}"${f === file ? ' aria-current="page"' : ''}>${label}</a>`).join('\n      ');
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="icon" href="${favicon}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Young+Serif&family=Figtree:ital,wght@0,400..700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="site.css?v=${V}">
</head>
<body>
<a class="skip" href="#main">Skip to the content</a>
<div class="demobar"><div class="wrap">Demo website. Willow Lane Hair &amp; Beauty is a made-up salon for testing an AI enquiry assistant.</div></div>
<header class="head">
  <div class="wrap">
    <a class="brand" href="./">${logo}<span>Willow Lane<small>Hair &amp; Beauty, Livingston</small></span></a>
    <button class="menu" id="menu" type="button" aria-expanded="false" aria-controls="nav">Menu</button>
    <nav class="nav" id="nav" aria-label="Main">
      ${nav}
      ${bare ? '' : '<button class="cta" type="button" data-open>Request an appointment</button>'}
    </nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="foot">
  <div class="wrap">
    <div class="cols">
      <div>
        <h3>Willow Lane Hair &amp; Beauty</h3>
        <p>Hair and beauty in Livingston, West Lothian.</p>
        <p>Tuesday to Friday 9am to 6pm (Thursday until 8pm), Saturday 9am to 4pm.</p>
      </div>
      <div>
        <h3>Pages</h3>
        <ul>
          <li><a href="services.html">Services and prices</a></li>
          <li><a href="visit.html">Visit us</a></li>
          <li><a href="faqs.html">FAQs</a></li>
        </ul>
      </div>
      <div>
        <h3>Contact</h3>
        <ul>
          <li><a href="tel:${TEL}">${PHONE}</a></li>
          <li><a href="mailto:${MAIL}">${MAIL}</a></li>
          <li><a href="owner.html">Salon inbox (demo)</a></li>
        </ul>
      </div>
    </div>
    <p class="fine">This is a demo. The salon, prices, phone number and email address are made up, and nothing on this site is a real offer. The chat assistant is an AI that can make mistakes.</p>
  </div>
</footer>
${bare ? '<script>window.SAM_NO_ASSISTANT = true;</script>' : `<div class="mbar"><a class="btn ghost" href="tel:${TEL}">Call the salon</a><button class="btn" type="button" data-open>Request an appointment</button></div>`}
<script src="config.js"></script>
<script src="site.js?v=${V}"></script>${bare ? `\n<script src="owner.js?v=${V}"></script>` : ''}
</body>
</html>
`;
}

/* ---------- content ---------- */

const MENU = [
  ['Cutting and styling', [
    ['Ladies cut and style', 'from £38'],
    ['Gents cut', 'from £22'],
    ["Children's cut", 'from £16'],
    ['Blow-dry', 'from £28'],
    ['Hair-up for an event', 'from £55'],
  ]],
  ['Colour', [
    ['Regrowth colour', 'from £48'],
    ['Full head colour', 'from £62'],
    ['Half-head highlights', 'from £75'],
    ['Balayage', 'from £110'],
    ['Toner', 'from £20'],
  ]],
  ['Nails', [
    ['Manicure', 'from £22'],
    ['Gel polish', 'from £28'],
    ['Pedicure', 'from £30'],
  ]],
  ['Brows, lashes and waxing', [
    ['Eyebrow shape', 'from £10'],
    ['Brow tint', 'from £12'],
    ['Lash lift', 'from £45'],
    ['Waxing', 'from £8'],
  ]],
  ['Make-up', [
    ['Make-up', 'from £40'],
    ['Bridal make-up, trial and day', 'from £90'],
  ]],
];
const menuHtml = (groups) => groups.map(([h, items]) => `<div><h3>${h}</h3><ul>${items.map(([n, p]) => `<li><span>${n}</span><i></i><b>${p}</b></li>`).join('')}</ul></div>`).join('\n      ');

const chipsHtml = ['Balayage for a wedding', 'Gents cut this week', 'Gel nails and brows', 'First time colour client']
  .map(t => `<button class="chip" type="button" data-ask="${t}">${t}</button>`).join('\n    ');

const sampleSheet = `<aside class="sheet" aria-label="Example appointment request">
  <div class="stripe" aria-hidden="true"></div>
  <div class="sheet-body">
    <h2>Appointment request</h2>
    <p class="sub">Example of what lands on the salon's phone.</p>
    <dl class="rows">
      <div class="row"><dt>Name</dt><dd>Example Client</dd></div>
      <div class="row"><dt>Service</dt><dd>Balayage and blow-dry</dd></div>
      <div class="row"><dt>Client</dt><dd>New, needs a patch test</dd></div>
      <div class="row"><dt>Details</dt><dd>Dark brown, shoulder length, never coloured. Photo of the shade she likes attached.</dd></div>
      <div class="row"><dt>Urgency</dt><dd><span class="pill urgent">Urgent</span></dd></div>
      <div class="row"><dt>Requested slot</dt><dd>Saturday 9am to 12pm</dd></div>
    </dl>
  </div>
</aside>
<p class="tilt-note">The salon confirms every appointment itself. <button class="linkbtn" type="button" data-open>Try the chat and send a photo.</button></p>`;

const pages = [];

/* HOME */
pages.push(page({
  file: 'index.html',
  title: 'Willow Lane Hair &amp; Beauty | Livingston salon (demo)',
  desc: 'A demo website for a West Lothian hair and beauty salon with an AI assistant that takes appointment requests, accepts photos and sends the salon a clear summary.',
  body: `
<section class="hero">
  <div class="wrap">
    <div>
      <h1>Tell us what you'd like, and we'll find you a chair</h1>
      <p class="lede">Chat to our assistant any time of day. Say what you want done and send a photo of the style you love. The salon reads it and confirms your time by text.</p>
      <div class="actions">
        <button class="btn" type="button" data-open>Request an appointment</button>
        <a class="btn ghost" href="services.html">See services and prices</a>
      </div>
    </div>
    <div>
      ${sampleSheet}
    </div>
  </div>
</section>

<section class="tryit"><div class="wrap">
  <h2>Try it as a client</h2>
  <div class="chips">
    ${chipsHtml}
  </div>
</div></section>

<section class="band">
  <div class="wrap">
    <h2>What we do</h2>
    <p class="intro">Prices start from the figures below. The stylist confirms the final price at your appointment.</p>
    <div class="menus">
      ${menuHtml([MENU[0], MENU[1]])}
    </div>
    <p class="btn-row"><a class="btn ghost" href="services.html">Beauty, nails and the full list</a></p>
  </div>
</section>

<section class="band tint">
  <div class="wrap fraserside">
    <div>
      <h2>See it from the salon's side</h2>
      <p class="intro">Every finished chat becomes an appointment request in the salon's inbox, with the photos the client sent and a tag for how soon it's needed. The team replies to the ones they want.</p>
      <a class="btn" href="owner.html">Open the demo inbox</a>
    </div>
    <div class="phone-mock" aria-label="Example of the salon inbox on a phone">
      <div class="pm-top">Requests</div>
      <ul>
        <li><span class="th" aria-hidden="true"></span><div><strong>Balayage and blow-dry</strong><span>Example Client, new</span></div><em class="pill urgent">Urgent</em></li>
        <li><span class="th" aria-hidden="true"></span><div><strong>Gel nails and brows</strong><span>Example Client, existing</span></div><em class="pill routine">Routine</em></li>
        <li><span class="th" aria-hidden="true"></span><div><strong>Gents cut</strong><span>Example Client, new</span></div><em class="pill routine">Routine</em></li>
      </ul>
    </div>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>How the assistant answers</h2>
    <p class="intro">It sticks to what the salon offers, quotes only the listed prices and never gives advice on skin or health. Examples of its replies:</p>
    <div class="qa">
      <div class="pair"><p class="q">How much is a balayage?</p><p class="a">From £110. The stylist confirms the final price at your appointment, because it depends on your hair's length and thickness.</p></div>
      <div class="pair"><p class="q">Do I need a patch test?</p><p class="a">Yes, for a first colour or tint, at least 48 hours before. The salon can arrange it when you request your appointment.</p></div>
      <div class="pair"><p class="q">Can I get extensions put in?</p><p class="a">Sorry, the salon doesn't do extensions. I can help with a cut, colour or an event style if you'd like.</p></div>
      <div class="pair"><p class="q">Can I come on a Monday?</p><p class="a">The salon is closed on Mondays. I can ask for Tuesday 10am to 12pm, Thursday 2pm to 5pm or Saturday 9am to 12pm.</p></div>
    </div>
  </div>
</section>

<section class="band tint">
  <div class="wrap">
    <h2>How a request works</h2>
    <p class="intro">No waiting on hold and no form to fill in.</p>
    <ol class="steps">
      <li><h3>Chat to the assistant</h3><p>Say what you'd like and add a photo of your hair or the look you want. It asks a few short questions, one or two at a time.</p></li>
      <li><h3>The salon gets a summary</h3><p>Your name, mobile number, service, hair history and photos land on the salon's phone in one tidy list.</p></li>
      <li><h3>The salon confirms</h3><p>They confirm your time by text or phone on a working day. Nothing is booked until they do.</p></li>
    </ol>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>What clients say</h2>
    <ul class="quotes">
      <li><p>Sent a photo of the shade I wanted and had a time offered the same evening.</p><cite>Example client, Livingston</cite></li>
      <li><p>It asked about my colour history, so the stylist was ready for me when I arrived.</p><cite>Example client, Bathgate</cite></li>
    </ul>
    <p class="demotag">These are made-up examples for the demo, not real reviews.</p>
  </div>
</section>

<div class="callstrip"><div class="wrap"><p>Ready for a new look? Tell the assistant what you have in mind.</p><button class="btn" type="button" data-open>Request an appointment</button></div></div>`,
}));

/* SERVICES */
pages.push(page({
  file: 'services.html',
  title: 'Services and prices | Willow Lane Hair &amp; Beauty (demo)',
  desc: 'Hair, colour, nails, brows, lashes, waxing and make-up at Willow Lane Hair and Beauty, with from prices.',
  body: `
<section class="page-head"><div class="wrap">
  <h1>Services and prices</h1>
  <p class="lede">All prices are from prices. The stylist confirms the final price at your appointment.</p>
</div></section>
<section class="band" style="padding-top:24px"><div class="wrap">
  <div class="menus">
      ${menuHtml(MENU)}
  </div>
  <div class="prose" style="margin-top:36px">
    <h2 style="margin-bottom:8px">Good to know</h2>
    <p>A patch test is needed at least 48 hours before a first colour or tint. The salon arranges it when you request your appointment.</p>
    <p>The salon doesn't offer hair extensions, perming, straight-razor shaves or medical treatments.</p>
    <p class="demotag">These services and prices are made up for the demo.</p>
    <button class="btn" type="button" data-open>Request an appointment</button>
  </div>
</div></section>`,
}));

/* VISIT */
pages.push(page({
  file: 'visit.html',
  title: 'Visit us | Willow Lane Hair &amp; Beauty (demo)',
  desc: 'Opening hours and contact details for Willow Lane Hair and Beauty in Livingston.',
  body: `
<section class="page-head"><div class="wrap">
  <h1>Visit us</h1>
  <p class="lede">The quickest way to start is to tell the assistant what you'd like.</p>
</div></section>
<section class="band" style="padding-top:24px"><div class="wrap visit">
  <div>
    <h2 style="margin-bottom:12px">Opening hours</h2>
    <dl class="hours">
      <dt>Monday</dt><dd>Closed</dd>
      <dt>Tuesday to Wednesday</dt><dd>9am to 6pm</dd>
      <dt>Thursday</dt><dd>9am to 8pm</dd>
      <dt>Friday</dt><dd>9am to 6pm</dd>
      <dt>Saturday</dt><dd>9am to 4pm</dd>
      <dt>Sunday</dt><dd>Closed</dd>
    </dl>
  </div>
  <div class="contact">
    <h2 style="margin-bottom:12px">Contact</h2>
    <dl>
      <dt>Phone (demo number)</dt><dd><a href="tel:${TEL}">${PHONE}</a></dd>
      <dt>Email (demo address)</dt><dd><a href="mailto:${MAIL}">${MAIL}</a></dd>
      <dt>Where</dt><dd>Livingston, West Lothian (demo salon, so no street address)</dd>
    </dl>
    <p style="margin-top:20px"><button class="btn" type="button" data-open>Request an appointment</button></p>
  </div>
</div></section>`,
}));

/* FAQS */
const FAQ = [
  ['How do I request an appointment?', 'Tell the assistant what you would like done, add a photo if it helps, and give your name, mobile number and the days that suit you. The salon confirms by text or phone.'],
  ['Is my appointment booked straight away?', 'No. The assistant offers times as requests. Nothing is booked until the salon confirms it with you.'],
  ['How much will it cost?', 'Every price on this site is a from price. Colour and long or thick hair can cost more, so the stylist confirms the final price at your appointment.'],
  ['Do I need a patch test?', 'Yes, for a first colour or tint, at least 48 hours before the appointment. The salon arranges it when you request your time.'],
  ['Can I send photos?', 'Yes. Use the camera button in the chat to attach up to two photos at a time, such as your hair now and the style or shade you like. The stylist sees them in your request.'],
  ['What if I have allergies or a sensitive scalp?', 'Tell the assistant and it will pass that on to your stylist, who will talk it through at your appointment. The assistant cannot give advice on skin or allergies.'],
  ['I had a reaction after a treatment.', 'If you have swelling of the face or lips, trouble breathing, spreading hives or severe burning, call 999 or go to A&E now. For anything milder, speak to a pharmacist, your GP or NHS 111, and tell the salon.'],
  ['Do you do hair extensions?', 'No. The salon doesn\'t offer hair extensions, perming, straight-razor shaves or medical treatments.'],
  ['Am I talking to a real person?', 'The chat is an AI assistant. It collects your details and passes them to the salon, whose team are real people. It can make mistakes, so the salon checks everything before confirming your appointment.'],
  ['What happens to what I type and send?', 'Your messages and photos go to Claude, an AI service, to write the replies. In this demo, the details and photos from a finished request are kept for 30 days so the salon can see them, and then deleted. A real site would have its own privacy notice.'],
];
pages.push(page({
  file: 'faqs.html',
  title: 'FAQs | Willow Lane Hair &amp; Beauty (demo)',
  desc: 'Answers on appointments, prices, patch tests, photos and how the chat assistant works.',
  body: `
<section class="page-head"><div class="wrap">
  <h1>Questions people ask</h1>
  <p class="lede">Can't find yours? Ask the assistant.</p>
</div></section>
<section class="band" style="padding-top:24px"><div class="wrap">
  <div class="faq">
    ${FAQ.map(([q, a]) => `<details><summary>${q}</summary><div><p>${a}</p></div></details>`).join('\n    ')}
  </div>
  <p style="margin-top:28px"><button class="btn" type="button" data-open>Ask the assistant</button></p>
</div></section>`,
}));

/* OWNER INBOX */
pages.push(page({
  file: 'owner.html',
  bare: true,
  title: 'Salon inbox | Willow Lane Hair &amp; Beauty (demo)',
  desc: 'Private inbox for the appointment requests taken by the website assistant.',
  body: `
<section class="page-head"><div class="wrap">
  <h1>Salon inbox</h1>
  <p class="lede">Appointment requests from the website assistant, newest first. For the salon team only.</p>
</div></section>
<section class="band" style="padding-top:24px"><div class="wrap">
  <form class="login" id="login" autocomplete="off">
    <label for="pass"><strong>Passphrase</strong></label>
    <div class="login-row">
      <input id="pass" type="password" autocomplete="current-password" required>
      <button class="btn" type="submit">Open inbox</button>
    </div>
    <p id="loginmsg" class="quiet" role="alert"></p>
  </form>
  <div id="inbox" hidden>
    <div class="inbox-bar">
      <div class="tabs" role="group" aria-label="Show">
        <button type="button" class="tab" data-f="new" aria-pressed="true">New <span id="cNew"></span></button>
        <button type="button" class="tab" data-f="handled" aria-pressed="false">Handled</button>
        <button type="button" class="tab" data-f="all" aria-pressed="false">All</button>
      </div>
      <span class="bar-gap"></span>
      <button type="button" class="linkbtn" id="refresh">Refresh</button>
      <button type="button" class="linkbtn" id="lock">Lock</button>
    </div>
    <p id="status" class="quiet" role="status"></p>
    <div class="inbox-grid">
      <ul class="inlist" id="list"></ul>
      <section id="detail" aria-live="polite"></section>
    </div>
  </div>
</div></section>`,
}));

const names = ['index.html', 'services.html', 'visit.html', 'faqs.html', 'owner.html'];
for (const p of pages) { /* written below */ }
names.forEach((n, i) => fs.writeFileSync(OUT + n, pages[i]));
console.log('wrote ' + names.join(', '));
