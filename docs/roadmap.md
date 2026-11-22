# GarmentLoop — Roadmap

## Phase 1 — Shoppable store + durable production (current)

**Status: Vercel production uses Neon; local demo still works without DB**

| Milestone | Status |
| --- | --- |
| Docs + brand tokens | Done (#9) |
| Commerce depth (filters, wishlist, reviews, zone shipping, Stripe session) | Done (#10) |
| Returns portal + webhooks + email | Done (#11) |
| Zero-DB / Vercel-ready demo seed + content pages + consent + multi-step checkout | Done (#12 / GitHub main) |
| Admin vs customer login discoverability | Done |
| Owner admin CRUD (bulk + forms end-to-end) | Done |
| **Neon Postgres production default (`DATABASE_URL` on Vercel)** | Done |

## Explicitly deferred (Could / Phase 2–3)

- Live carrier APIs / prepaid RMA labels
- Apple Pay / Google Pay / BNPL
- Avalara / full VAT
- Production OTP email delivery
- AI personalization, i18n, loyalty subscriptions

## Run

```bash
npm install && npm run build && npm start
# optional durable local DB:
# cp .env.example .env.local  # set DATABASE_URL
# npm run db:migrate
```

http://localhost:43123 — no env required (demo). With `DATABASE_URL`, uses Neon.

**Production:** https://garment-loop-store.vercel.app (Neon)  
**GitHub:** https://github.com/bilalpiaic/garment-loop-store (`main`)


See [progress-vs-requirements.md](./progress-vs-requirements.md) for % complete vs original specs.
