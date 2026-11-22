# GarmentLoop — Project Context

## Goals

Ship a **complete, shoppable GarmentLoop demo** that runs locally and on Vercel **without requiring a database**. Circular-wardrobe / modern atelier brand for quality-minded shoppers.

## Hard constraints (current)

- **No required `DATABASE_URL`.** Demo persistence = in-memory + file (`.data/` or `/tmp`). Neon is optional.
- Optional Stripe / email keys with safe mock fallbacks.
- Guest checkout + COD must keep working.

## Brand

Soft Cream `#F5F1E8`, Warm Ochre `#E5B65B`, Deep Olive `#4A5F43`, Charcoal `#333333`, Rust `#B35D44`, Sage `#7D8B6B`. Serif headlines (Newsreader) + sans body (Geist). WCAG AA.

## Repo

- GitHub: https://github.com/bilalpiaic/garment-loop-store (default branch `main`)
- Origin: `bilalpiaic/garment-loop-store`
- Local: `npm run dev` → http://localhost:43123
- Production: https://garment-loop-store.vercel.app (Vercel project `garment-loop-store`, team bilalpiaics-projects)
- No required `DATABASE_URL`
- Stacked PRs on Origin: #9 docs → #10 commerce → #11 returns/email → #12 vercel-ready demo

## Decisions

| Topic | Decision |
| --- | --- |
| Persistence | Demo store by default; Neon only when URL set (with fallback if Neon fails) |
| Payments | Stripe Checkout when keys set; else COD / bank / card_demo |
| Email | Resend or SMTP when set; else console mock |
| Catalog | Seeded circular/winter SKUs in `src/lib/catalog.ts` |

## Related docs

requirements · architecture · design-system · roadmap · admin-spec · storefront-spec
