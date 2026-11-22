# GarmentLoop — Architecture

## Persistence

| Mode | When | Notes |
| --- | --- | --- |
| **Neon (production default on Vercel)** | `DATABASE_URL` set | Drizzle schema (`inventory`, `orders`, `platform_state`) + JSON catalog/admin state; **falls back to demo** if Neon errors |
| **Demo** | `DATABASE_URL` unset | `src/lib/platform-memory.ts` — global memory + `.data/` or `/tmp` file |

On Vercel project `garment-loop-store`, pooled `DATABASE_URL` is configured for production / preview / development, so deployed environments use Neon by default. Local runs without `.env.local` stay on the demo store.

`ensureDemoWalkthrough` / `ensureSeed` seed catalog, admin users, discounts, content pages, sample orders/customers, and a pending review when empty (including first Neon load).

Migrate locally: `npm run db:migrate` (requires `DATABASE_URL`).

## Stack

Next.js 16 App Router · React 19 · TypeScript · Tailwind 4 · shadcn/ui · Zustand · Zod · Neon (Vercel default) · optional Stripe / Resend / SMTP.

## Integrations

| Service | Env | Fallback |
| --- | --- | --- |
| Neon | `DATABASE_URL` | Demo memory/file |
| Stripe Checkout | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | COD / bank / card_demo |
| Stripe webhooks | `STRIPE_WEBHOOK_SECRET` | No-op 200 |
| Email | `RESEND_API_KEY` or `SMTP_HOST` + `SMTP_USER` (+ `SMTP_PASS`, `SMTP_PORT`, `SMTP_SECURE`) and optional `EMAIL_FROM` | Console mock |
| Customer OTP | Same email stack; `AUTH_SHOW_OTP=1` to return/show code in API (auto outside production) | Mock email logs code preview; production API omits `devCode` unless `AUTH_SHOW_OTP` |
| GA4 | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | No scripts / events when unset |
| Meta Pixel | `NEXT_PUBLIC_META_PIXEL_ID` | No scripts / events when unset |

## Storefront analytics

Consent banner (`garmentloop-consent`) gates marketing tags: **Accept analytics** loads GA4 + Meta; **Essential only** keeps them off. Both IDs are optional public env vars — never invent measurement IDs.

| Surface | GA4 | Meta |
| --- | --- | --- |
| Product grids | `view_item_list`, `select_item` | — |
| PDP | `view_item` | `ViewContent` |
| Add / remove bag | `add_to_cart`, `remove_from_cart` | `AddToCart` |
| Checkout | `begin_checkout` | `InitiateCheckout` |
| Order confirm | `purchase` | `Purchase` |
| Admin mark refunded | `refund` (staff, consent bypass) | — |

Page views fire on client navigations after consent when either ID is set. Implementation: `src/lib/analytics/*` + `AnalyticsBootstrap`.

## Auth email (customer OTP)

`POST /api/auth/otp/request` stores a hashed 6-digit code (10‑minute TTL) and calls `sendLoginOtpEmail` via Resend or SMTP. Production never returns `devCode` unless `AUTH_SHOW_OTP=1`. Without mail keys, delivery is mock (server console) — shoppers will not receive an inbox message until `RESEND_API_KEY` or `SMTP_*` is set on Vercel.

## Vercel

- App Router + serverless routes only.
- Production uses Neon via `DATABASE_URL`; Admin → Settings reports “Neon Postgres” when the URL is set.
- Without `DATABASE_URL`, demo mode re-seeds on cold start — fine for local demos.
- For live OTP email on production, set `RESEND_API_KEY` (preferred) or `SMTP_HOST` + `SMTP_USER` + `SMTP_PASS`, plus `EMAIL_FROM` with a verified sender.

## Key libs

`platform.ts` · `platform-neon.ts` · `platform-memory.ts` · `seed-demo.ts` · `db/migrate.ts` · `shipping.ts` · `tax.ts` · `stripe.ts` · `email.ts` · `analytics/`
