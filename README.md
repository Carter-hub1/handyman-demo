# Keith's Handyman Booking (demo)

A mock handyman website with a chat assistant that books jobs, and a schedule view for the handyman. All names, prices and reviews are made up.

- `index.html` the whole site (customer view and handyman view). Hosted on GitHub Pages.
- `config.js` holds the address of the Worker.
- `worker/` a Cloudflare Worker that keeps the AI key secret, calls Claude (or Groq), and stores the shared schedule.

Open the handyman view directly with `#handyman` on the end of the address.

## Setup (all free tiers)

1. **AI key (pick one):**
   - **Claude (recommended, most reliable):** make an API key at console.anthropic.com, add a few dollars of credit, and set a monthly spend limit.
   - **Groq (free tier):** create an account at console.groq.com and make an API key.
2. **Cloudflare:** create a free account, then from the `worker/` folder:
   ```
   npx wrangler login
   npx wrangler kv namespace create STATE      # copy the id it prints into wrangler.toml
   npx wrangler secret put ANTHROPIC_API_KEY  # paste the Claude key when asked
   # or, for Groq instead:  npx wrangler secret put GROQ_API_KEY
   ```
   Edit `ALLOWED_ORIGIN` in `wrangler.toml` to your GitHub Pages address, then:
   ```
   npx wrangler deploy                         # prints the Worker address
   ```
3. Put the Worker address in `config.js`.
4. Push to GitHub and turn on Pages (Settings, Pages, deploy from the main branch).

## Booking confirmation emails (optional)

Off until you set it up. Emails are sent from your own Gmail through a small Google Apps Script, so no domain is needed.

1. Go to script.google.com, create a new project, and paste in `worker/mail-relay.gs`. Replace `PASTE_A_LONG_RANDOM_TEXT_HERE` with a long random phrase and keep a copy of it.
2. Deploy, then New deployment, type Web app, Execute as Me, Who has access Anyone. Approve the Gmail permission when asked. Copy the web app URL.
3. In the `worker/` folder, add these as Worker secrets (one command at a time):
   ```
   npx wrangler secret put MAIL_WEBHOOK_URL --name keith-handyman-api    # the web app URL
   npx wrangler secret put MAIL_SECRET --name keith-handyman-api         # the long random phrase
   npx wrangler secret put KEITH_EMAIL --name keith-handyman-api         # optional: Keith gets a copy of each booking
   ```
4. Deploy the updated Worker code.

Safety limits: at most 20 emails a day (change with an `EMAIL_DAILY_CAP` variable), one email per booking, a fixed message template, and a note that it is a demo. Gmail itself limits how many emails a personal account can send each day.

## Limits

- Anyone with the link can use the chat, which spends your AI credit. Share the link only with Keith.
- Bookings are stored as one shared record. Two people booking in the same second could overwrite each other. A real version would use a proper database.
- If `ANTHROPIC_API_KEY` is set the Worker uses Claude (`CLAUDE_MODEL`, default `claude-haiku-5-5`). Otherwise it uses Groq (`MODEL`, default `llama-3.3-70b-versatile`). Set `PROVIDER = "groq"` to force Groq.
- Anyone with the link spends your key's credit. Set a spend limit on the key.
