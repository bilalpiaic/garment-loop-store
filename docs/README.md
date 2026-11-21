# GarmentLoop Store

Premium **circular-wardrobe / modern atelier** ecommerce demo for **GarmentLoop**.

**No database required.** Catalog, cart, checkout, admin, returns, reviews, and sample orders run on an in-memory/file demo store. Neon (`DATABASE_URL`) is optional for durable persistence.

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

## Deploy on Vercel (no DB)

1. Import `bilalpiaic/garment-loop-store` in Vercel (framework: Next.js).
2. **Do not set `DATABASE_URL`** unless you want Neon — the demo store works on serverless memory/`/tmp`.
3. Optional env vars (all safe to omit):

| Variable | Effect when set |
| --- | --- |
| `DATABASE_URL` | Neon persistence |
| `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Live Stripe Checkout |
| `STRIPE_WEBHOOK_SECRET` | `/api/stripe/webhook` |
| `RESEND_API_KEY` or `SMTP_*` | Real transactional email |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | WhatsApp confirm links |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Override owner seed |

4. Deploy. Suggested project name: `garment-loop-ecommerce`.

> Demo mode on Vercel: state lives in the warm serverless instance (and best-effort `/tmp`). Cold starts re-seed sample data. For durable production data later, attach Neon.

## Documentation

See [`docs/`](./docs/) for requirements, architecture, design system, roadmap, admin + storefront specs.

## Remaining Phase-3 / Could items (deferred)

- Live carrier rate/label APIs
- Stripe wallets / BNPL
- Avalara/VAT tax engine
- Production OTP email for auth
- Prepaid RMA labels, AI personalization, i18n, loyalty

## Stack

Next.js App Router · TypeScript · Tailwind · shadcn/ui · Zustand · Stripe (optional) · Resend/SMTP (optional) · Drizzle/Neon (optional)
