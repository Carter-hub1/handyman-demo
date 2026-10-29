import fs from 'node:fs';
const OUT = '/home/claude/handyman-demo/handyman/';
const PHONE = '0131 496 0147';
const TEL = '01314960147';
const MAIL = 'fraser@example.com';

const logo = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="10.5" y="8" width="3" height="14" rx="1.5" fill="#C9A27A"/><rect x="3" y="3" width="15" height="6" rx="2" fill="#FFC20E"/><rect x="16" y="4.5" width="5" height="3" rx="1" fill="#FFFFFF"/></svg>`;
const favicon = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='10.5' y='8' width='3' height='14' rx='1.5' fill='%23C9A27A'/%3E%3Crect x='3' y='3' width='15' height='6' rx='2' fill='%23FFC20E'/%3E%3Crect x='16' y='4.5' width='5' height='3' rx='1' fill='%23FFFFFF'/%3E%3C/svg%3E`;

const NAV = [
  ['index.html', 'Home', './'],
  ['services.html', 'Services', 'services.html'],
  ['areas.html', 'Areas', 'areas.html'],
  ['about.html', 'About', 'about.html'],
  ['faqs.html', 'FAQs', 'faqs.html'],
  ['contact.html', 'Contact', 'contact.html'],
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
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500..700&family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="site.css?v=3">
</head>
<body>
<a class="skip" href="#main">Skip to the content</a>
<div class="demobar"><div class="wrap">Demo website. Fraser's Handyman is a made-up business for testing an AI enquiry assistant.</div></div>
<header class="head">
  <div class="wrap">
    <a class="brand" href="./">${logo}<span>Fraser's Handyman</span></a>
    <button class="menu" id="menu" type="button" aria-expanded="false" aria-controls="nav">Menu</button>
    <nav class="nav" id="nav" aria-label="Main">
      ${nav}
      ${bare ? '' : '<button class="cta" type="button" data-open>Ask the assistant</button>'}
    </nav>
    <div class="side-info"><a href="tel:${TEL}">${PHONE}</a><p>Mon to Fri 8am to 6pm<br>Sat 9am to 1pm</p></div>
  </div>
</header>
<div class="safety"><div class="wrap"><strong>Fire, smoke or a gas smell? Call 999.</strong> For gas, also call 0800 111 999. Fraser doesn't do out-of-hours call-outs.</div></div>
<main id="main">
${body}
</main>
<footer class="foot">
  <div class="wrap">
    <div class="cols">
      <div>
        <h3>Fraser's Handyman</h3>
        <p>Small jobs around the house in West Lothian.</p>
        <p>Mon to Fri 8am to 6pm, Sat 9am to 1pm.</p>
      </div>
      <div>
        <h3>Pages</h3>
        <ul>
          <li><a href="services.html">Services</a></li>
          <li><a href="areas.html">Areas we cover</a></li>
          <li><a href="about.html">About Fraser</a></li>
          <li><a href="faqs.html">FAQs</a></li>
          <li><a href="contact.html">Contact</a></li>
        </ul>
      </div>
      <div>
        <h3>Contact</h3>
        <ul>
          <li><a href="tel:${TEL}">${PHONE}</a></li>
          <li><a href="mailto:${MAIL}">${MAIL}</a></li>
          <li><a href="owner.html">Owner inbox (demo)</a></li>
        </ul>
      </div>
    </div>
    <p class="fine">This is a demo. The business, phone number and email address are made up, and nothing on this site is a real offer of work. The chat assistant is an AI that can make mistakes.</p>
  </div>
</footer>
${bare ? '<script>window.SAM_NO_ASSISTANT = true;</script>' : `<div class="mbar"><a class="btn ghost" href="tel:${TEL}">Call Fraser</a><button class="btn" type="button" data-open>Ask the assistant</button></div>`}
<script src="config.js"></script>
<script src="site.js?v=3"></script>${bare ? '\n<script src="owner.js?v=3"></script>' : ''}
</body>
</html>
`;
}


const sampleSheet = `<aside class="sheet" aria-label="Example job sheet">
  <div class="stripe" aria-hidden="true"></div>
  <div class="sheet-body">
    <h2>Job sheet for Fraser</h2>
    <p class="sub">Example of what lands on Fraser's phone.</p>
    <dl class="rows">
      <div class="row"><dt>Name</dt><dd>Example Customer</dd></div>
      <div class="row"><dt>Address and postcode</dt><dd>Example Street, Bathgate</dd></div>
      <div class="row"><dt>Job type</dt><dd>Mounting a TV</dd></div>
      <div class="row"><dt>Details</dt><dd>55 inch TV on a plasterboard wall. Bracket already bought. Would like the cables hidden.</dd></div>
      <div class="row"><dt>Urgency</dt><dd><span class="pill routine">Routine</span></dd></div>
      <div class="row"><dt>Requested slot</dt><dd>Friday 9am to 12pm</dd></div>
    </dl>
  </div>
</aside>
<p class="tilt-note">Fraser confirms every visit himself. <button class="linkbtn" type="button" data-open>Try the chat and send a photo.</button></p>`;

const chipsHtml = ['Mount a TV on my wall', 'My tap keeps dripping', 'Build a wardrobe', 'My door will not close']
  .map(t => `<button class="chip" type="button" data-ask="${t}">${t}</button>`).join('\n          ');

const SERVICES = [
  ['furniture-assembly', 'Furniture assembly', 'Wardrobes, beds, desks and shelving built, and fixed to the wall where needed.', 'What the items are, how many, and which rooms they go in.'],
  ['mounting', 'TV, shelf and mirror mounting', 'TVs, floating shelves, mirrors and curtain poles fixed securely to the wall.', 'What is being mounted, how big or heavy it is, and what the wall is made of.'],
  ['doors-locks', 'Doors, hinges and locks', 'Sticking doors, loose hinges, new handles and replacement locks.', 'Which door, what it does, and whether it is a front door or an inside door.'],
  ['taps-toilets', 'Taps, toilets and sealant', 'Dripping taps, running toilets, and worn sealant round baths and showers.', 'Which room, what is happening, and whether you can turn the water off.'],
  ['painting', 'Painting and touch-ups', 'Patch, sand and repaint walls, trims and ceilings.', 'Which rooms, roughly how big, and whether anything needs preparing first.'],
  ['fences-decking', 'Fences, gates and decking', 'Rotten fence panels, broken gate latches and loose deck boards replaced.', 'What is damaged, roughly how much, and how to get into the garden.'],
  ['wall-repairs', 'Wall and ceiling repairs', 'Holes, cracks and dents filled and made good, ready for painting.', 'How many, roughly how big, and which rooms.'],
  ['odd-jobs', 'Small odd jobs', 'A list of little jobs that never get done? Fraser does them together in one visit.', 'A rough list, and which rooms they are in.'],
];

const pages = [];

/* HOME */
pages.push(page({
  file: 'index.html',
  title: "Fraser's Handyman | Handyman in West Lothian (demo)",
  desc: 'A demo website for a West Lothian handyman with an AI assistant that takes enquiries, accepts photos and sends Fraser a clear job sheet.',
  body: `
<section class="hero">
  <div class="wrap">
    <div>
      <h1>Handyman for small jobs around the house in West Lothian</h1>
      <p class="lede">Mounting, assembly, repairs and touch-ups. Tell our assistant what needs doing, any time of day, and send a photo if it helps. Fraser reads the details and gets back to you on a working day.</p>
      <div class="actions">
        <button class="btn" type="button" data-open>Tell us about your job</button>
        <a class="btn ghost" href="tel:${TEL}">Call ${PHONE}</a>
      </div>
      <p class="try">Not sure what to type? Tap one.</p>
      <div class="chips">
          ${chipsHtml}
      </div>
    </div>
    <div>
      ${sampleSheet}
    </div>
  </div>
</section>

<div class="trust"><div class="wrap">
  <ul>
    <li><strong>Free quotes</strong><span>For every job</span></li>
    <li><strong>Mon to Fri 8am to 6pm</strong><span>Saturday 9am to 1pm</span></li>
    <li><strong>West Lothian</strong><span>Livingston, Bathgate and nearby</span></li>
    <li><strong>Homes and landlords</strong><span>Big lists and one-off jobs</span></li>
  </ul>
</div></div>

<section class="band">
  <div class="wrap">
    <h2>What Fraser does</h2>
    <p class="intro">Small jobs for homes across West Lothian. Quotes are free.</p>
    <ul class="ruled">
      ${SERVICES.map(([id, name, text]) => `<li><div><a href="services.html#${id}"><strong>${name}</strong></a><span>${text}</span></div></li>`).join('\n      ')}
    </ul>
  </div>
</section>

<section class="band white">
  <div class="wrap">
    <h2>How an enquiry works</h2>
    <p class="intro">No waiting on hold and no form to fill in.</p>
    <ol class="steps">
      <li><h3>Tell the assistant</h3><p>Say what needs doing and add a photo if you like. It asks a few short questions and checks the job is something Fraser covers.</p></li>
      <li><h3>Fraser gets a job sheet</h3><p>Your name, address, the job, your photos and when suits you land on Fraser's phone in one tidy list.</p></li>
      <li><h3>Fraser confirms</h3><p>He confirms a visit and the price by phone, text or WhatsApp on a working day. Nothing is booked until he does.</p></li>
    </ol>
  </div>
</section>

<section class="band">
  <div class="wrap">
    <h2>What you can expect</h2>
    <ul class="ruled">
      <li><strong>Free quotes</strong><span>Fraser visits, or asks for photos first. You are not charged for the quote.</span></li>
      <li><strong>Straight answers</strong><span>No jargon. If a job is not one Fraser does, he says so.</span></li>
      <li><strong>Several jobs, one visit</strong><span>Got a list? Put it all in one enquiry and Fraser plans a single visit.</span></li>
      <li><strong>Your area</strong><span>Livingston, Broxburn, Bathgate, Whitburn, Linlithgow and nearby. <a href="areas.html">See the full list</a>.</span></li>
    </ul>
  </div>
</section>

<section class="band white">
  <div class="wrap">
    <h2>Got a job in mind?</h2>
    <p class="intro">The assistant is open on every page, in the corner of your screen.</p>
    <button class="btn" type="button" data-open>Ask the assistant</button>
  </div>
</section>`,
}));

/* SERVICES */
pages.push(page({
  file: 'services.html',
  title: "Services | Fraser's Handyman (demo)",
  desc: 'Handyman services in West Lothian: furniture assembly, mounting, doors and locks, taps and toilets, painting, fences and wall repairs.',
  body: `
<section class="page-head"><div class="wrap">
  <h1>Services</h1>
  <p class="lede">Small jobs for homes. Every job starts with a free quote.</p>
</div></section>
<section class="band" style="padding-top:0"><div class="wrap">
  ${SERVICES.map(([id, name, text, ready]) => `<div class="service" id="${id}">
    <div><h2>${name}</h2></div>
    <div>
      <p>${text}</p>
      <p class="quiet" style="margin-bottom:0"><strong>Useful to know when you ask:</strong> ${ready}</p>
    </div>
  </div>`).join('\n  ')}
  <div class="prose" style="margin-top:32px">
    <h2 style="margin-bottom:8px">What Fraser doesn't do</h2>
    <p>Electrical work, gas work, roofing, tree removal, asbestos and structural work need a registered specialist. Tell the assistant anyway and it will point you in the right direction.</p>
    <p>Prices depend on the job, so Fraser gives a quote after he has seen the details or your photos.</p>
    <button class="btn" type="button" data-open>Ask about a job</button>
  </div>
</div></section>`,
}));

/* AREAS */
const TOWNS = ['Livingston', 'Broxburn', 'Bathgate', 'Whitburn', 'Linlithgow'];
pages.push(page({
  file: 'areas.html',
  title: "Areas we cover | Fraser's Handyman (demo)",
  desc: 'Fraser covers Livingston, Broxburn, Bathgate, Whitburn, Linlithgow and nearby parts of West Lothian.',
  body: `
<section class="page-head"><div class="wrap">
  <h1>Areas we cover</h1>
  <p class="lede">West Lothian and the places around it.</p>
</div></section>
<section class="band" style="padding-top:0"><div class="wrap">
  <ul class="towns">
    ${TOWNS.map(t => `<li>${t}</li>`).join('\n    ')}
  </ul>
  <div class="prose">
    <p>Fraser also works in the villages around these towns. If you are further out, ask anyway. Give the assistant your postcode and Fraser will confirm whether he can cover it.</p>
    <p>Fraser works Monday to Friday, 8am to 6pm, and Saturday mornings. There are no Sunday or out-of-hours call-outs.</p>
    <button class="btn" type="button" data-open>Check my area</button>
  </div>
</div></section>`,
}));

/* ABOUT */
pages.push(page({
  file: 'about.html',
  title: "About Fraser | Fraser's Handyman (demo)",
  desc: 'About Fraser, a West Lothian handyman who deals with every customer himself.',
  body: `
<section class="page-head"><div class="wrap">
  <h1>About Fraser</h1>
  <p class="lede">A local handyman, not a call centre.</p>
</div></section>
<section class="band" style="padding-top:0"><div class="wrap">
  <div class="prose">
    <p>Fraser's Handyman does small jobs for homes in West Lothian. Fraser reads every enquiry himself and confirms every visit himself.</p>
    <p>The assistant on this site takes your details when Fraser is on a job, so enquiries are not missed. It can't diagnose problems, give prices or promise a visit. Those are Fraser's decisions.</p>
    <h2 style="margin:28px 0 8px">How the assistant helps</h2>
    <p>It asks what needs doing, checks it is not an emergency, looks at any photos you send, and collects your name, address and phone number. Fraser gets a job sheet with all of it in one place, ready to act on.</p>
  </div>
  <div class="placeholder"><strong>For a real business, this space holds:</strong> years trading, insurance details, any trade scheme memberships and a photo of the owner.</div>
</div></section>`,
}));

/* FAQS */
const FAQ = [
  ['How much will it cost?', 'It depends on the job, so Fraser gives a quote once he has the details. Quotes are free. He will either visit or ask for photos first.'],
  ['Can I send photos?', 'Yes. Use the camera button in the chat to attach up to two photos at a time. Fraser sees them on your job sheet. Photos help him work out what tools and parts to bring.'],
  ['I have a leak. What should I do?', 'If you can do it safely, turn off the water at the stopcock and keep away from electrics if water is near them. If anyone is at risk, call 999. Fraser doesn\'t do out-of-hours call-outs, so if you need someone tonight, look for a 24-hour emergency tradesperson.'],
  ['I can smell gas. What should I do?', 'Call 999 and the National Gas Emergency Service on 0800 111 999. Don\'t use switches or naked flames, and open windows if it is safe. Fraser doesn\'t do gas work.'],
  ['Do you do electrical or gas work?', 'No. Fraser doesn\'t do electrical work, gas work, roofing, tree removal, asbestos or structural work. For those you need a registered specialist.'],
  ['Do you work at weekends?', 'Saturday mornings, 9am to 1pm. Fraser is closed on Sundays.'],
  ['Do you cover my area?', 'Fraser works in Livingston, Broxburn, Bathgate, Whitburn, Linlithgow and nearby. If you are somewhere else, give the assistant your postcode and Fraser will confirm.'],
  ['I rent my home. Can you help?', 'Yes, with your landlord\'s permission for anything that changes the property. Landlords can also ask about jobs across several properties.'],
  ['Am I talking to a real person?', 'The chat is an AI assistant. It collects your details and passes them to Fraser, who is a real person. It can make mistakes, so Fraser checks everything before he confirms a visit.'],
  ['What happens to what I type and send?', 'Your messages and photos go to Claude, an AI service, to write the replies. In this demo, the details and photos from a finished enquiry are kept for 30 days so Fraser can see them, and then deleted. A real site would have its own privacy notice.'],
];
pages.push(page({
  file: 'faqs.html',
  title: "FAQs | Fraser's Handyman (demo)",
  desc: 'Answers on quotes, photos, emergencies, opening hours, areas covered and how the chat assistant works.',
  body: `
<section class="page-head"><div class="wrap">
  <h1>Questions people ask</h1>
  <p class="lede">Can't find yours? Ask the assistant.</p>
</div></section>
<section class="band" style="padding-top:0"><div class="wrap">
  <div class="faq">
    ${FAQ.map(([q, a]) => `<details><summary>${q}</summary><div><p>${a}</p></div></details>`).join('\n    ')}
  </div>
  <p style="margin-top:28px"><button class="btn" type="button" data-open>Ask the assistant</button></p>
</div></section>`,
}));

/* CONTACT */
pages.push(page({
  file: 'contact.html',
  title: "Contact | Fraser's Handyman (demo)",
  desc: 'Contact Fraser: use the assistant any time, or call during working hours.',
  body: `
<section class="page-head"><div class="wrap">
  <h1>Contact</h1>
  <p class="lede">The quickest way is to tell the assistant. Fraser gets a full job sheet.</p>
</div></section>
<section class="band" style="padding-top:0"><div class="wrap">
  <div class="contact">
    <div>
      <h2 style="margin-bottom:12px">Ask the assistant</h2>
      <p>Open any time of day. Describe the job, add a photo if you like, and the assistant collects the details Fraser needs.</p>
      <button class="btn" type="button" data-open>Start a chat</button>
      <p class="quiet" style="margin-top:14px">For fire, smoke or a gas smell, call 999 instead.</p>
    </div>
    <dl>
      <dt>Phone (demo number)</dt><dd><a href="tel:${TEL}">${PHONE}</a></dd>
      <dt>Email (demo address)</dt><dd><a href="mailto:${MAIL}">${MAIL}</a></dd>
      <dt>Hours</dt><dd>Monday to Friday, 8am to 6pm. Saturday, 9am to 1pm. Closed Sundays.</dd>
      <dt>Area</dt><dd>Livingston, Broxburn, Bathgate, Whitburn, Linlithgow and nearby. <a href="areas.html">Full list</a></dd>
    </dl>
  </div>
</div></section>`,
}));

/* OWNER INBOX */
pages.push(page({
  file: 'owner.html',
  bare: true,
  title: "Owner inbox | Fraser's Handyman (demo)",
  desc: 'Private inbox for the enquiries taken by the website assistant.',
  body: `
<section class="page-head"><div class="wrap">
  <h1>Owner inbox</h1>
  <p class="lede">Enquiries from the website assistant, newest first. For Fraser only.</p>
</div></section>
<section class="band" style="padding-top:0"><div class="wrap">
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

const names = ['index.html', 'services.html', 'areas.html', 'about.html', 'faqs.html', 'contact.html', 'owner.html'];
names.forEach((n, i) => fs.writeFileSync(OUT + n, pages[i]));
console.log('wrote', names.join(', '));
