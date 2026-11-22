# GarmentLoop — Project Context

## Goals

Ship a **complete, shoppable GarmentLoop** store that runs locally (demo, no DB required) and on Vercel with **Neon Postgres as the durable production default**. Circular-wardrobe / modern atelier brand for quality-minded shoppers.

## Hard constraints (current)

- **Vercel production/preview:** `DATABASE_URL` (Neon pooled) is set — catalog, orders, admin users persist across deploys.
- **Local / unset `DATABASE_URL`:** Demo persistence = in-memory + file (`.data/` or `/tmp`). Neon is optional locally.
- If Neon is unreachable while `DATABASE_URL` is set, the platform falls back to the demo store.
- Optional Stripe / email keys with safe mock fallbacks.
- Guest checkout + COD must keep working.

## Brand

Soft Cream `#F5F1E8`, Warm Ochre `#E5B65B`, Deep Olive `#4A5F43`, Charcoal `#333333`, Rust `#B35D44`, Sage `#7D8B6B`. Serif headlines (Newsreader) + sans body (Geist). WCAG AA.

## Repo

- GitHub: https://github.com/bilalpiaic/garment-loop-store (default branch `main`)
- Origin: `bilalpiaic/garment-loop-store`
- Local: `npm run dev` → http://localhost:43123
- Production: https://garment-loop-store.vercel.app (Vercel project `garment-loop-store`, team bilalpiaics-projects)
- Neon project: **GarmentLoop** (`weathered-river-12462418`, `aws-us-east-2`) — no secrets in docs
- Stacked PRs historically: #9 docs → #10 commerce → #11 returns/email → vercel-ready demo → Neon production default

## Decisions

| Topic | Decision |
| --- | --- |
| Persistence | Neon when `DATABASE_URL` set (Vercel default); demo when unset; fallback to demo if Neon fails |
| Payments | Stripe Checkout when keys set; else COD / bank / card_demo |
| Email | Resend or SMTP when set; else console mock |
| Catalog | Seeded circular/winter SKUs in `src/lib/catalog.ts` |

## Related docs

requirements · architecture · design-system · roadmap · admin-spec · storefront-spec · **progress-vs-requirements**

## Auth surfaces

- Shoppers: `/account/login` (email OTP)
- Staff/Owner: `/admin/login` (email + password)

## Admin

Owner/admin CRUD across products, taxonomy, inventory, orders, customers (notes/tags), discounts, reviews, returns, circular (take-back / repair / subscriptions), content, users (owner), settings — durable on Neon in production; demo store locally without DB.
