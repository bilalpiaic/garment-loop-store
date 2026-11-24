# GarmentLoop — Roadmap

## Phase 1 — Shoppable store + durable production (current)

**Status: garmentloop.com on cPanel + MySQL; Vercel/Neon still optional; local demo without DB**

| Milestone | Status |
| --- | --- |
| Docs + brand tokens | Done |
| Commerce depth (filters, wishlist, reviews, zone shipping, Stripe session) | Done |
| Returns portal + webhooks + email | Done |
| Zero-DB / Vercel-ready demo seed + content pages + consent + multi-step checkout | Done |
| Admin vs customer login discoverability | Done |
| Owner admin CRUD (bulk + forms end-to-end) | Done |
| Production QA on Neon (Vercel) | Done (historical) |
| Neon Postgres path (`DATABASE_URL` postgres) | Done (kept for Vercel) |
| **cPanel deploy + `server.js` / reverse-proxy** | Done (#11) |
| **Hide admin demo credentials on `/admin/login`** | Done (#12) |
| **cPanel MySQL/MariaDB persistence for garmentloop.com** | Done (#12) |
| Theme / colors / UI polish | Done |
| Production customer OTP email (Resend/SMTP) | Done (code); set mail keys for inbox delivery |
| Circular take-back / repair / recycling subscriptions (MVP) | Done |

## Explicitly deferred (Could / Phase 2–3)

- Live carrier APIs / prepaid RMA labels
- Enable cPanel `passengerapps` (cleaner than reverse-proxy + cron)
- Apple Pay / Google Pay / BNPL (Dashboard enablement)
- Avalara / full VAT
- AI personalization, i18n, loyalty points beyond circular memberships

## Run

```bash
npm install && npm run build && npm start
# optional durable local DB (mysql or postgres):
# cp .env.example .env.local  # set DATABASE_URL or MYSQL_*
# npm run db:migrate
```

http://localhost:43123 — no env required (demo).

**Live:** https://garmentloop.com (cPanel MySQL)  
**Vercel:** https://garment-loop-store.vercel.app (Neon when keyed)  
**GitHub:** https://github.com/bilalpiaic/garment-loop-store (`main`)

See [progress-vs-requirements.md](./progress-vs-requirements.md) and [cpanel-deploy.md](./cpanel-deploy.md).
