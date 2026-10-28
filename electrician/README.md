# Sam's Electrical (demo)

A made-up electrician's website chat, for trying out an AI enquiry assistant. All names are invented and it is not a real business.

This demo lives in the `electrician/` folder of the handyman-demo repo. The handyman demo at the root of this repo is separate and has its own Worker.

A visitor chats as a customer. When the assistant has the details, a **job sheet** fills in beside the chat. That is what the electrician would receive.

- `index.html`, `services.html`, `areas.html`, `about.html`, `faqs.html` and `contact.html` are the website. `site.css` and `site.js` are shared. `site.js` holds the chat assistant, which sits in the corner of every page and keeps the conversation as visitors move around.
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
