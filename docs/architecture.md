# GarmentLoop — Architecture

## Persistence (zero-DB first)

| Mode | When | Notes |
| --- | --- | --- |
| **Demo** | No `DATABASE_URL` | `src/lib/platform-memory.ts` — global memory + `.data/` or `/tmp` file |
| **Neon** | `DATABASE_URL` set | Drizzle + `platform_state` JSON; **falls back to demo** if Neon errors |

`ensureDemoWalkthrough` seeds discounts, content pages, sample orders/customers, and a pending review when empty.

## Stack

Next.js 16 App Router · React 19 · TypeScript · Tailwind 4 · shadcn/ui · Zustand · Zod · optional Stripe / Resend / SMTP / Neon.

## Integrations (all optional)

| Service | Env | Fallback |
| --- | --- | --- |
| Neon | `DATABASE_URL` | Demo memory/file |
| Stripe Checkout | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | COD / bank / card_demo |
| Stripe webhooks | `STRIPE_WEBHOOK_SECRET` | No-op 200 |
| Email | `RESEND_API_KEY` or `SMTP_*` | Console mock |

## Vercel

- No long-lived local servers; App Router + serverless routes only.
- Demo mode re-seeds on cold start — fine for demos; attach Neon for durable production later.

## Key libs

`platform.ts` · `platform-memory.ts` · `seed-demo.ts` · `shipping.ts` · `tax.ts` · `stripe.ts` · `email.ts`
