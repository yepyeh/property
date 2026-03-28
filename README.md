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
