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
| Account | `/account/login` (OTP shown outside production) → orders → returns → `/account/circular` |
| Circular | `/circular` take-back · repair · subscribe (mock without Stripe) |
| Admin | `/admin` · owner@garmentloop.store / GarmentLoop-Owner-2026 · CSV import, Security (MFA), Audit log, Circular queue · Settings shows Neon vs demo |

Seeded: winter SKUs, discounts (`WINTER10`, `WELCOME500`), sample orders, pending review, content pages.

## Deploy on cPanel (garmentloop.com)

Preferred host path is cPanel **Setup Node.js App** / Passenger with startup file **`server.js`** (Node 20+), then `npm ci && npm run build`. Full DNS, env-var names, `.htaccess` / Passenger notes, and the **PHP-only fallback** (keep Vercel + domain DNS) are in [`docs/cpanel-deploy.md`](./docs/cpanel-deploy.md).

## Deploy on Vercel

1. Import `bilalpiaic/garment-loop-store` in Vercel (framework: Next.js).
2. Project `garment-loop-store` already has pooled `DATABASE_URL` (Neon) for production / preview / development — that is the production default.
3. Optional env vars (all safe to omit for a demo):

| Variable | Effect when set |
| --- | --- |
| `DATABASE_URL` | Neon persistence (set on Vercel; optional locally) |
| `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Payment Element (cards, wallets, BNPL) + circular subscription Checkout |
| `STRIPE_WEBHOOK_SECRET` | `/api/stripe/webhook` |
| `CIRCULAR_SUBSCRIPTIONS_MOCK` | Force mock circular memberships even when Stripe is keyed |
| `STRIPE_PRICE_*_MONTHLY` | Optional Stripe Price IDs for Care / Repair+ / Recycle Loop |
| `RESEND_API_KEY` or `SMTP_HOST` + `SMTP_USER` (+ `SMTP_PASS`) | Real transactional email (orders, returns, **customer login OTP**) |
| `EMAIL_FROM` | From address. Resend test sender `onboarding@resend.dev` can only deliver to the Resend account owner email. After verifying a domain at resend.com/domains, use e.g. `GarmentLoop <orders@garmentloop.store>` (or `noreply@your-verified-domain`). |
| `AUTH_SHOW_OTP` | Return OTP in API / UI (default on outside production; keep off in prod) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | WhatsApp confirm links |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 ecommerce (consent-gated; no-op when unset) |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel (consent-gated; no-op when unset) |
| `EASYPOST_API_KEY` + `EASYPOST_FROM_*` | Live carrier rates at checkout (else zone rates) |
| `AVALARA_ACCOUNT_ID` + `AVALARA_LICENSE_KEY` | Live Avalara tax quotes (else local PK/GCC/intl) |
| `TAXJAR_API_KEY` | TaxJar quotes when Avalara unset |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Override owner seed |
| `ADMIN_MFA_REQUIRED` | When `1`/`true`, owner/admin must enroll + use TOTP (staff optional) |

### Enable live EasyPost rates

1. Create an EasyPost account and copy a **test** or **production** API key (do not invent or paste keys into the repo).
2. Set on Vercel / `.env.local`:
   - `EASYPOST_API_KEY`
   - `EASYPOST_FROM_NAME`, `EASYPOST_FROM_STREET1`, `EASYPOST_FROM_CITY`, `EASYPOST_FROM_STATE`, `EASYPOST_FROM_ZIP`, `EASYPOST_FROM_COUNTRY` (usually `PK`), optional `EASYPOST_FROM_PHONE`
3. Redeploy / restart. Checkout step 2 calls `POST /api/shipping/rates` — live options when the key + from-address are complete; otherwise zone fallback.
4. Admin order detail has **Create label (stub)** — tracking fields work today; buying outbound / prepaid RMA labels is intentionally stubbed (`501` from `/api/admin/shipping/label`).

### Enable live tax quotes

1. **Local (default):** Pakistan ≈5% sales tax, GCC ≈5% VAT, international = duties at destination (shown as line items in checkout).
2. **Avalara:** set `AVALARA_ACCOUNT_ID`, `AVALARA_LICENSE_KEY`, optional `AVALARA_COMPANY_CODE` (default `DEFAULT`), `AVALARA_ENV=sandbox|production`.
3. **TaxJar:** if Avalara is unset, set `TAXJAR_API_KEY` (+ optional `TAXJAR_FROM_*` / `TAXJAR_ENV=sandbox`).
4. Redeploy. Checkout calls `POST /api/tax/quote`; order create uses the same resolver. Never invent or commit API keys.

5. Deploy. After migrate + seed, Admin → Settings reports **Neon Postgres**.

> Without `DATABASE_URL` (typical local): state lives in memory / `.data` / best-effort `/tmp`. Cold starts re-seed sample data.

## Documentation

See [`docs/`](./docs/) for requirements, architecture, design system, roadmap, admin + storefront specs.

### Enable Stripe wallets / BNPL

1. Create a Stripe account and copy **real** secret + publishable keys (never invent or commit them).
2. Set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` on Vercel / `.env.local`.
3. In Stripe Dashboard → Settings → Payment methods: enable **Klarna**, **Afterpay / Clearpay**, and any wallets you need. Apple Pay / Google Pay also need a verified domain for production.
4. Set `STRIPE_WEBHOOK_SECRET` and point a webhook to `POST /api/stripe/webhook` (`payment_intent.succeeded`, `checkout.session.completed`).
5. Redeploy. Checkout offers **Card · wallets · BNPL** → `/order/{id}/pay` with Express Checkout + Payment Element. Without keys, COD / bank / card_demo remain.

## Remaining Phase-3 / Could items (deferred)

- Prepaid RMA / outbound EasyPost label purchase (rates env-gated; buy stubbed)
- ~~Stripe wallets / BNPL~~ (Payment Element path; enable methods in Stripe Dashboard)
- Avalara/VAT tax engine
- Prepaid RMA labels, AI personalization, i18n, loyalty points beyond circular memberships

> Customer OTP email is implemented; set Resend/SMTP on Vercel for production inbox delivery.  
> Circular take-back / repair / subscriptions MVP is live at `/circular` (mock billing without Stripe).

## Stack

Next.js App Router · TypeScript · Tailwind · shadcn/ui · Zustand · Drizzle/Neon (Vercel default) · Stripe (optional) · Resend/SMTP (optional)
