# GarmentLoop Store

Premium **circular-wardrobe / modern atelier** ecommerce demo for **GarmentLoop**.

**Production on Vercel uses Neon** (`DATABASE_URL`). Locally, no database is required — catalog, cart, checkout, admin, returns, reviews, and sample orders run on an in-memory/file demo store when `DATABASE_URL` is unset.

## Run locally (zero config)

```bash
npm install
npm run dev
# or production mode:
npm run build && npm start
```

Open [http://localhost:43123](http://localhost:43123).

Optional: `cp .env.example .env.local` — every variable is optional.

### Demo walkthrough

| Area | What to try |
| --- | --- |
| Storefront | Home → Shop filters → PDP (wishlist/reviews) → Cart → multi-step Checkout (COD) |
| Account | `/account/login` (OTP shown outside production) → orders → returns |
| Admin | `/admin` · owner@garmentloop.store / GarmentLoop-Owner-2026 |

Seeded: winter SKUs, discounts (`WINTER10`, `WELCOME500`), sample orders, pending review, content pages.

## Deploy on Vercel

1. Import `bilalpiaic/garment-loop-store` in Vercel (framework: Next.js).
2. Project `garment-loop-store` has pooled Neon `DATABASE_URL` for production / preview / development (production default).
3. Optional env vars (all safe to omit for a local-style demo):

| Variable | Effect when set |
| --- | --- |
| `DATABASE_URL` | Neon persistence (set on Vercel; optional locally) |
| `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Live Stripe Checkout |
| `STRIPE_WEBHOOK_SECRET` | `/api/stripe/webhook` |
| `RESEND_API_KEY` or `SMTP_*` | Real transactional email |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | WhatsApp confirm links |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 ecommerce (consent-gated) |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel (consent-gated) |
| `EASYPOST_API_KEY` + `EASYPOST_FROM_*` | Live carrier rates (zone fallback otherwise) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Override owner seed |

4. Deploy. Admin → Settings reports **Neon Postgres** when `DATABASE_URL` is present.

> Without `DATABASE_URL` (typical local): state lives in memory / `.data` / best-effort `/tmp`. Cold starts re-seed sample data.

## Documentation

See [`docs/`](./docs/) for requirements, architecture, design system, roadmap, admin + storefront specs.

## Remaining Phase-3 / Could items (deferred)

- Prepaid RMA / outbound label purchase (EasyPost rates are wired; label buy is stubbed)
- Stripe wallets / BNPL
- Avalara/VAT tax engine
- Production OTP email for auth
- Prepaid RMA labels, AI personalization, i18n, loyalty

## Stack

Next.js App Router · TypeScript · Tailwind · shadcn/ui · Zustand · Stripe (optional) · Resend/SMTP (optional) · Drizzle/Neon (optional)
