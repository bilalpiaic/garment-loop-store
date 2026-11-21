# Architecture

## Runtime

Next.js App Router on Vercel. Storefront + `/admin` share one deployment.

## Persistence

- **Default (zero-DB):** in-memory / file demo store (`platform-memory` / local file). Seeded catalog, orders, discounts, admins.
- **Optional:** Neon via `DATABASE_URL` + Drizzle (`platform-neon`).

Cart is client-only (Zustand + localStorage). Checkout is `POST /api/checkout`.

## Auth

- Customers: email OTP (dev code logged / returned outside production).
- Admin: password login with Owner / Admin / Staff roles.

## Payments

COD and bank transfer always available. Stripe Checkout when keys are set; card-demo path for demos without Stripe.
