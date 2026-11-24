# GarmentLoop — Architecture

## Persistence

| Mode | When | Notes |
| --- | --- | --- |
| **MySQL / MariaDB (garmentloop.com)** | `DATABASE_URL` starts with `mysql://` **or** `MYSQL_HOST` + `MYSQL_USER` + `MYSQL_DATABASE` | Drizzle + `mysql2`; tables `inventory`, `orders`, `platform_state`, `order_number_seq`; **falls back to demo** if MySQL errors |
| **Neon / Postgres (Vercel option)** | `DATABASE_URL` is `postgresql://…` | Drizzle + `@neondatabase/serverless`; same logical tables + `place_order` function; **falls back to demo** if Neon errors |
| **Demo** | No DB URL / MYSQL_* | `src/lib/platform-memory.ts` — global memory + `.data/` or `/tmp` file |

Dialect detection: [`src/db/client.ts`](https://github.com/bilalpiaic/garment-loop-store/blob/main/src/db/client.ts). Migrate with `npm run db:migrate`.

**Live cPanel:** app under `/home/garmentloop21/repositories/garment-loop-store`, Node 22 (`ea-nodejs22`), `server.js` behind Apache reverse-proxy (port **3060** after cutover; keepalive `~/bin/garmentloop-start.sh`). Feature `passengerapps` not enabled on the package.

## Integrations

| Service | Env | Fallback |
| --- | --- | --- |
| MySQL (cPanel) | `DATABASE_URL` mysql://… or `MYSQL_*` | Demo memory/file |
| Neon | `DATABASE_URL` postgresql://… | Demo memory/file |
| Stripe payments | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | COD / bank / card_demo |
| Email | `RESEND_API_KEY` or `SMTP_*` + optional `EMAIL_FROM` | Console mock |
| Customer OTP | Same email stack; `AUTH_SHOW_OTP` for API `devCode` outside prod | Mock / failed send returns safe `emailError` |
| GA4 | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | No scripts / events when unset |
| Meta Pixel | `NEXT_PUBLIC_META_PIXEL_ID` | No scripts / events when unset |
| EasyPost shipping | `EASYPOST_API_KEY` + `EASYPOST_FROM_*` | Zone rates |

## Tax engine

Local PK (~5% sales tax) / GCC (~5% VAT) / intl (duties at destination). Optional Avalara (`AVALARA_ACCOUNT_ID` + `AVALARA_LICENSE_KEY`) or TaxJar (`TAXJAR_API_KEY`). Checkout shows tax line items via `POST /api/tax/quote`. No invented keys.

## Stripe wallets / BNPL

When Stripe keys are set, checkout creates a PaymentIntent (`automatic_payment_methods`) and routes to `/order/{id}/pay` with **Express Checkout Element** + **Payment Element**. Confirm via `POST /api/stripe/confirm`. No invented keys.

## Shipping rates

Checkout `POST /api/shipping/rates` returns EasyPost carrier options when the API key and ship-from address are set; otherwise zone rates.

## Storefront analytics

Consent banner (`garmentloop-consent`) gates marketing tags. Both measurement IDs are optional — never invent them.

## Auth email (customer OTP)

`POST /api/auth/otp/request` hashes a 6-digit code and sends via the email stack. Production omits `devCode` unless `AUTH_SHOW_OTP=1`.

**Admin UI:** `/admin/login` shows email/password fields only — no on-page demo password list.

## Related

See [cpanel-deploy.md](./cpanel-deploy.md) for host steps and live status.
