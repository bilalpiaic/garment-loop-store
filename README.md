# GarmentLoop Store

Premium **circular-wardrobe / modern atelier** ecommerce for **GarmentLoop**.

**Production (Vercel)** uses **Neon Postgres** via `DATABASE_URL` for durable catalog, orders, and admin data.  
**Locally**, no database is required — catalog, cart, checkout, admin, returns, reviews, and sample orders run on an in-memory/file demo store when `DATABASE_URL` is unset. If Neon is configured but unreachable, the app falls back to that demo store.

**Live:** https://garment-loop-store.vercel.app  
**GitHub:** https://github.com/bilalpiaic/garment-loop-store

## Run locally (zero config)

```bash
npm install
npm run dev
# or production mode:
npm run build && npm start
```

Open [http://localhost:43123](http://localhost:43123).

Optional: `cp .env.example .env.local` — every variable is optional. Set `DATABASE_URL` only if you want Neon locally, then `npm run db:migrate`.

### Demo walkthrough

| Area | What to try |
| --- | --- |
| Storefront | Home → Shop filters → PDP (wishlist/reviews) → Cart → multi-step Checkout (COD) |
| Account | `/account/login` (OTP shown outside production) → orders → returns |
| Admin | `/admin` · owner@garmentloop.store / GarmentLoop-Owner-2026 · Settings shows Neon vs demo |

Seeded: winter SKUs, discounts (`WINTER10`, `WELCOME500`), sample orders, pending review, content pages.

## Deploy on Vercel

1. Import `bilalpiaic/garment-loop-store` in Vercel (framework: Next.js).
2. Project `garment-loop-store` already has pooled `DATABASE_URL` (Neon) for production / preview / development — that is the production default.
3. Optional env vars (all safe to omit for a demo):

| Variable | Effect when set |
| --- | --- |
| `DATABASE_URL` | Neon persistence (set on Vercel; optional locally) |
| `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Live Stripe Checkout |
| `STRIPE_WEBHOOK_SECRET` | `/api/stripe/webhook` |
| `RESEND_API_KEY` or `SMTP_HOST` + `SMTP_USER` (+ `SMTP_PASS`) | Real transactional email (orders, returns, **customer login OTP**) |
| `EMAIL_FROM` | From address. Resend test sender `onboarding@resend.dev` can only deliver to the Resend account owner email. After verifying a domain at resend.com/domains, use e.g. `GarmentLoop <orders@garmentloop.store>` (or `noreply@your-verified-domain`). |
| `AUTH_SHOW_OTP` | Return OTP in API / UI (default on outside production; keep off in prod) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | WhatsApp confirm links |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 ecommerce (consent-gated; no-op when unset) |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel (consent-gated; no-op when unset) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Override owner seed |

4. Deploy. After migrate + seed, Admin → Settings reports **Neon Postgres**.

> Without `DATABASE_URL` (typical local): state lives in memory / `.data` / best-effort `/tmp`. Cold starts re-seed sample data.

## Documentation

See [`docs/`](./docs/) for requirements, architecture, design system, roadmap, admin + storefront specs.

## Remaining Phase-3 / Could items (deferred)

- Live carrier rate/label APIs
- Stripe wallets / BNPL
- Avalara/VAT tax engine
- Prepaid RMA labels, AI personalization, i18n, loyalty

> Customer OTP email is implemented; set Resend/SMTP on Vercel for production inbox delivery.

## Stack

Next.js App Router · TypeScript · Tailwind · shadcn/ui · Zustand · Drizzle/Neon (Vercel default) · Stripe (optional) · Resend/SMTP (optional)
