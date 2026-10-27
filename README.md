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

## Limits

- Anyone with the link can use the chat, which spends your AI credit. Share the link only with Keith.
- Bookings are stored as one shared record. Two people booking in the same second could overwrite each other. A real version would use a proper database.
- If `ANTHROPIC_API_KEY` is set the Worker uses Claude (`CLAUDE_MODEL`, default `claude-haiku-5-5`). Otherwise it uses Groq (`MODEL`, default `llama-3.3-70b-versatile`). Set `PROVIDER = "groq"` to force Groq.
- Anyone with the link spends your key's credit. Set a spend limit on the key.
