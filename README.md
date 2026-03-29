# Astro on Cloudflare

This project is configured to run Astro on Cloudflare Workers with Wrangler.

## Commands

- `npm run dev`: start Astro locally
- `npm run build`: build the project
- `npm run preview`: build and preview with Wrangler
- `npm run deploy`: build and deploy to Cloudflare

## Cloudflare login

Authenticate Wrangler with your Cloudflare account:

```bash
npx wrangler login
```

Then deploy:

```bash
npm run deploy
```
## Help centre maintenance rule

When a user-visible workflow changes, update the matching help-centre article in the same change.

Current help content lives in:

- `src/content/help/`

Minimum expectation:

1. buyer workflow change -> update the relevant buyer/help article
2. owner workflow change -> update the relevant owner/help article
3. billing or notification change -> update the matching article
4. notable product release -> add or update an article in the `updates` category

This keeps the live help centre aligned with the real product instead of turning into stale documentation.
