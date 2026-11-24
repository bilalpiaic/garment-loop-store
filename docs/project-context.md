# GarmentLoop — Project Context

## Goals

Ship a **complete, shoppable GarmentLoop** store that runs locally (demo, no DB required), on **cPanel (garmentloop.com) with MySQL/MariaDB**, and optionally on Vercel with Neon Postgres. Circular-wardrobe / modern atelier brand for quality-minded shoppers.

## Hard constraints (current)

- **garmentloop.com (cPanel):** MySQL/MariaDB via `DATABASE_URL=mysql://…` or `MYSQL_*` in server `.env.production` — durable catalog, orders, admin.
- **Vercel production/preview:** may use Neon Postgres `DATABASE_URL` (pooled) when configured.
- **Local / unset DB URL:** Demo persistence = in-memory + file (`.data/` or `/tmp`).
- If the configured DB is unreachable, the platform falls back to the demo store.
- Optional Stripe / email keys with safe mock fallbacks.
- Guest checkout + COD must keep working.
- **`/admin/login` must not display demo passwords** (seed accounts remain server-side only).

## Brand

Soft Cream `#F5F1E8`, Warm Ochre `#E5B65B`, Deep Olive `#4A5F43`, Charcoal `#333333`, Rust `#B35D44`, Sage `#7D8B6B`. Serif headlines (Newsreader) + sans body (Geist). WCAG AA.

## Repo

- GitHub: https://github.com/bilalpiaic/garment-loop-store (default branch `main`)
- Origin: `bilalpiaic/garment-loop-store`
- Local: `npm run dev` → http://localhost:43123
- **Primary live:** https://garmentloop.com (cPanel user `garmentloop21`, DNS IP `109.123.246.57`, SSH port `2200`)
- Vercel preview/backup: https://garment-loop-store.vercel.app
- Neon project (optional / Vercel): kept for postgres path — no secrets in docs
- Recent: #11 cPanel Passenger/`server.js` → #12 hide admin demo creds + MySQL dialect

## Decisions

| Topic | Decision |
| --- | --- |
| Persistence | MySQL when `mysql://` or `MYSQL_*` (cPanel default); Neon/Postgres when `postgresql://`; demo when unset; fallback to demo if DB fails |
| Payments | Stripe Checkout when keys set; else COD / bank / card_demo |
| Email | Resend or SMTP when set; else console mock |
| Catalog | Seeded circular/winter SKUs in `src/lib/catalog.ts` |
| Admin login UI | No public “Demo credentials” box |

## Related docs

requirements · architecture · design-system · roadmap · admin-spec · storefront-spec · cpanel-deploy · **progress-vs-requirements**

## Auth surfaces

- Shoppers: `/account/login` (email OTP)
- Staff/Owner: `/admin/login` (email + password — credentials not shown on page)

## Admin

Owner/admin CRUD across products, taxonomy, inventory, orders, customers (notes/tags), discounts, reviews, returns, circular (take-back / repair / subscriptions), content, users (owner), settings — durable on **cPanel MySQL** for garmentloop.com; Neon on Vercel when keyed; demo store locally without DB.
