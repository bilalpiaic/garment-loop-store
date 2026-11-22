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
| Email | `RESEND_API_KEY` or `SMTP_*` | Console mock |

## Vercel

- App Router + serverless routes only.
- Production uses Neon via `DATABASE_URL`; Admin → Settings reports “Neon Postgres” when the URL is set.
- Without `DATABASE_URL`, demo mode re-seeds on cold start — fine for local demos.

## Key libs

`platform.ts` · `platform-neon.ts` · `platform-memory.ts` · `seed-demo.ts` · `db/migrate.ts` · `shipping.ts` · `tax.ts` · `stripe.ts` · `email.ts`
