# GarmentLoop — Roadmap

## Phase 1 — Complete shoppable demo (current)

**Status: Vercel-ready demo without required DB**

| Milestone | Status |
| --- | --- |
| Docs + brand tokens | Done (#9) |
| Commerce depth (filters, wishlist, reviews, zone shipping, Stripe session) | Done (#10) |
| Returns portal + webhooks + email | Done (#11) |
| **Zero-DB / Vercel-ready demo seed + content pages + consent + multi-step checkout** | Done (#12 / GitHub main) |
| Admin vs customer login discoverability | Done |

## Explicitly deferred (Could / Phase 2–3)

- Live carrier APIs / prepaid RMA labels
- Apple Pay / Google Pay / BNPL
- Avalara / full VAT
- Production OTP email delivery
- AI personalization, i18n, loyalty subscriptions

## Run

```bash
npm install && npm run build && npm start
```

http://localhost:43123 — no env required.

**Production:** https://garment-loop-store.vercel.app  
**GitHub:** https://github.com/bilalpiaic/garment-loop-store (`main`)


See [progress-vs-requirements.md](./progress-vs-requirements.md) for % complete vs original specs.
