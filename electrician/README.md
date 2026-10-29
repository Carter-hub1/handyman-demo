# Sam's Electrical (demo)

A made-up electrician's website chat, for trying out an AI enquiry assistant. All names are invented and it is not a real business.

This demo lives in the `electrician/` folder of the handyman-demo repo. The handyman demo at the root of this repo is separate and has its own Worker.

A visitor chats as a customer. When the assistant has the details, a **job sheet** fills in beside the chat. That is what the electrician would receive.

- `index.html`, `services.html`, `areas.html`, `about.html`, `faqs.html` and `contact.html` are the website. `site.css` and `site.js` are shared. `site.js` holds the chat assistant, which sits in the corner of every page and keeps the conversation as visitors move around.
- `owner.html` and `owner.js` are the owner inbox: a private page that lists the finished enquiries, with photos, and lets Sam mark them handled.
- `demo.html` is the chat beside a live job sheet, for showing what the owner receives. The site is hosted on GitHub Pages.
- `config.js` holds the address of the Worker.
- `worker/` is a Cloudflare Worker. `prompt.js` holds the assistant's instructions, and `index.js` applies the limits and calls Claude. The instructions and the AI key stay on the server, so visitors cannot read or change them.

## Setup (free tiers, plus a few pounds of AI credit)

1. **AI key.** Make an API key at console.anthropic.com, add a few pounds of credit, and **set a monthly spend limit**. This is separate from a claude.ai subscription.
2. **Cloudflare.** Make a free account, then from the `worker/` folder:
   ```
   npx wrangler login
   npx wrangler kv namespace create LIMITS     # paste the id it prints into wrangler.toml
   npx wrangler secret put ANTHROPIC_API_KEY   # paste the key when asked
   ```
   In `wrangler.toml`, set `ALLOWED_ORIGIN` to your GitHub Pages address (for example `https://your-name.github.io`, with no path). Then:
   ```
   npx wrangler deploy                         # prints the Worker address
   ```
3. Put the Worker address in `config.js`.
4. Push to GitHub. This repo's Pages site serves the folder at `https://your-name.github.io/handyman-demo/electrician/` (Settings, Pages, deploy from the `main` branch, root folder, if it is not already on).
5. Open the page and run the test script from the work plan before you share the link.

## Photos, the owner inbox and email to Sam

- **Photos.** The camera button in the chat lets a customer attach up to two photos. The browser shrinks each one to a small JPEG, which also removes its location data, and the Worker passes it to Claude. Photos for an enquiry are kept in KV for 30 days, at most 6 per enquiry.
- **Saved enquiries.** When a chat ends in a job sheet, the Worker saves it in the same `LIMITS` KV namespace, one record per chat, and deletes it after 30 days.
- **Owner inbox.** Open `owner.html` and enter the passphrase. Set it once with `npx.cmd wrangler secret put OWNER_TOKEN` (make up a long phrase). Ten wrong guesses lock that visitor out for an hour. Anyone with the passphrase can read every enquiry and photo, so treat it like a password.
- **Email to Sam (optional).** Each new enquiry can be emailed once. Set three more secrets with `npx.cmd wrangler secret put`: `MAIL_WEBHOOK_URL` (the web app address from `mail-relay.gs`), `MAIL_SECRET` (the long phrase inside that script) and `SAM_EMAIL` (who receives it). The same script works for the Keith demo. At most 20 emails a day (`EMAIL_DAILY_CAP`). The inbox link in the email comes from `ALLOWED_ORIGIN`, or set `OWNER_URL` to override it.
- **Free KV limits.** The free plan allows 1,000 writes a day. Each chat message uses two (the counters), and each photo or finished enquiry adds one or two more, so keep `DAILY_CAP` at 400 or lower on the free plan.
- **Before a real client uses it.** Customers' names, phone numbers, addresses and photos are personal data. You need a privacy notice that says where they are stored, who sees them and for how long, and a way to delete them on request. Take proper advice first.

## Limits that protect your AI credit

- The page sends only the conversation. The Worker ignores any instructions, model or length settings sent from the browser.
- A visitor can send 40 messages an hour, and the whole demo 400 a day (change with `HOURLY_CAP` and `DAILY_CAP` in `wrangler.toml`). Each message uses two KV writes, so the default daily cap stays inside the free KV allowance.
- Each message is at most 800 characters, a chat is at most 30 messages, and each reply is at most 700 tokens.
- Without the `LIMITS` KV namespace there are no counters, so set it up before sharing.
- Only the address in `ALLOWED_ORIGIN` can call the Worker from a browser. Other programs can fake that header, so the spend limit on the API key is the real safety net.

## Using it for a real client

Change only the `BUSINESS FACTS` block in `worker/prompt.js` (services, area, hours, slots), then run `npx wrangler deploy` again. Leave the safety rules and the `NEVER` list as they are.

## Know before you show it

- The assistant is an AI and can still get things wrong. The instructions tell it never to give prices, never to promise visits or certificates, and to send burning smells, sparks and shocks to 999, but check each of those yourself before showing it to anyone.
- It is a demo, not a booking system. Nothing is saved and nothing is sent to the electrician.

## The handyman site (Fraser's Handyman)

`../handyman/` is a second demo website, for a made-up handyman. It uses this same Worker, so there is nothing extra to deploy. After pulling the latest code, run `npx.cmd wrangler deploy` once in this folder.

- The handyman pages send `trade: "handyman"` with each chat message. The Worker then uses `prompt-handyman.js` (no prices, handyman jobs, gas and flood safety) instead of `prompt.js`.
- Saved enquiries are tagged with their trade. Each owner inbox shows only its own site's enquiries. Both inboxes use the same `OWNER_TOKEN` passphrase.
- Emails say which business the enquiry is for.
- The handyman site has no photo images yet. Add some to `handyman/images/` and reference them from the pages.

## Instant phone alert (optional)

Each new enquiry can also push a short alert to the owner's phone through the free ntfy app. It is easier to switch on than the email and needs no Google script.

1. Install the **ntfy** app on the phone and subscribe to a long random topic name, for example `fraser-jobs-k7x2q9m4v8w1`. The topic name acts as the password, so make it at least 16 characters and keep it private.
2. In `electrician\worker` run `npx.cmd wrangler secret put NTFY_TOPIC` and type that topic name. For a separate handyman topic, also set `NTFY_TOPIC_HANDYMAN`.
3. Run `npx.cmd wrangler deploy`.

The push says only the urgency, job type and photo count (for example "Mounting a TV (2 photos)") and opens the inbox when tapped. Names, addresses and phone numbers are never sent. At most 50 pushes a day (`PUSH_DAILY_CAP`).
