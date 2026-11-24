# GarmentLoop Store

Premium **circular-wardrobe / modern atelier** ecommerce for **GarmentLoop**.

**Live on cPanel:** https://garmentloop.com — **MySQL/MariaDB** persistence.  
**Vercel option:** Neon Postgres when `DATABASE_URL` is postgresql.  
**Locally:** no database required (demo memory/file store).

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
| Admin | `/admin/login` (email + password; no on-page demo passwords) |

Seeded: winter SKUs, discounts (`WINTER10`, `WELCOME500`), sample orders, pending review, content pages.

## Deploy

- **cPanel / garmentloop.com:** [cpanel-deploy.md](./cpanel-deploy.md) — Node + MySQL, reverse-proxy notes.
- **Vercel:** import the repo; optional Neon `DATABASE_URL`.

Admin → Settings reports **MySQL / MariaDB**, **Neon Postgres**, or demo mode.

## Documentation

See this folder for requirements, architecture, design system, roadmap, admin + storefront specs, and progress vs requirements.

## Stack

Next.js App Router · TypeScript · Tailwind · shadcn/ui · Zustand · Stripe (optional) · Resend/SMTP (optional) · Drizzle + MySQL / Neon (optional)
