# Willow Lane Hair & Beauty demo

A made-up West Lothian salon with an AI enquiry assistant. It has its own Worker, KV store, API secret and inbox passphrase, separate from the electrician and handyman demos.

- Site: this folder (`index.html`, `services.html`, `visit.html`, `faqs.html`, `owner.html`). Rebuild the pages with `node build.mjs`.
- Worker: `worker/` (name `willow-lane-api`). The salon instructions are in `worker/prompt-hairdresser.js`. Change only the BUSINESS FACTS block for a real salon.
- The site finds the Worker through `config.js`. Check that the address matches the one Wrangler prints after deploying.

## Set up the Worker (once)

In the `hairdresser\worker` folder:

1. `npx.cmd wrangler kv namespace create LIMITS` and copy the `id` it prints into `wrangler.toml` (replace `PASTE_KV_NAMESPACE_ID_HERE`). This must be a new namespace, not the one the other demos use.
2. `npx.cmd wrangler secret put ANTHROPIC_API_KEY` (the same key as the other demos works).
3. `npx.cmd wrangler secret put OWNER_TOKEN` and type a new passphrase of your own for the salon inbox. The name has no full stop on the end.
4. `npx.cmd wrangler deploy`. Copy the `https://willow-lane-api....workers.dev` address it prints. If it differs from the one in `config.js`, change `config.js` and push.

## Optional extras

These work the same way as the shared Worker (see `../electrician/README.md`): email alerts (`MAIL_WEBHOOK_URL`, `MAIL_SECRET`, `OWNER_EMAIL`), instant phone alerts through ntfy (`NTFY_TOPIC`) and live availability from a Google Calendar (`AVAIL_URL`, `AVAIL_SECRET`, using `worker/availability.gs`).
