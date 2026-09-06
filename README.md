# GarmentLoop Store

Premium winter apparel storefront for **GarmentLoop** — jackets, knitwear, trousers, and accessories, with guest checkout and cash on delivery for Pakistan.

Catalog, search, cart, checkout, and order confirmation run on Next.js. Orders and stock persist to **Neon Postgres** when `DATABASE_URL` is set (required on Vercel). Locally, orders fall back to a file store if Neon is not configured.

Production URL: [https://garment-loop-ecommerce.vercel.app](https://garment-loop-ecommerce.vercel.app)

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:43123](http://localhost:43123).

```bash
npm run build
npm start
```

Production mode (`npm start`) is the reliable way to shop the full checkout flow.

Set `DATABASE_URL` in `.env.local` to a Neon connection string, then apply schema and seed inventory:

```bash
npm run db:migrate
```

## Deploy (Vercel + Neon)

1. Neon is already connected via `DATABASE_URL` (pooled connection string).
2. Create a Vercel project named **`garment-loop-ecommerce`** from `bilalpiaic/garment-loop-store` so the host is `garment-loop-ecommerce.vercel.app`.
3. Add environment variables on Vercel:
   - `DATABASE_URL` — Neon pooled URL
   - `NEXT_PUBLIC_WHATSAPP_NUMBER` — optional WhatsApp number (digits only, with country code)
   - `RESEND_API_KEY` and `EMAIL_FROM` — customer email OTP (see [docs/otp-setup.md](docs/otp-setup.md))
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` — customer SMS OTP
   - `BLOB_READ_WRITE_TOKEN` — product image uploads on Vercel (Vercel Blob)
4. Deploy from this repo. Schema and catalog stock seed on first checkout if they are missing.

```bash
npx vercel --yes --name garment-loop-ecommerce
npx vercel env add DATABASE_URL production
npx vercel --prod --yes
```

## What you can do

- Browse the winter collection, categories, and product pages with size/color variants
- Search from the header and filter the shop by category, color, size, and price
- Switch display currency between PKR and USD
- Add to bag, check out as a guest, and place a COD / bank transfer / demo card order
- Confirm the order on WhatsApp
- Sign in at `/account/login` with **email or mobile number** and a password. Owner/admin/staff skip OTP. Customers receive a real 6-digit OTP by **email (Resend)** or **SMS (Twilio)** depending on what they typed. See [docs/otp-setup.md](docs/otp-setup.md).
- Sign in to the admin portal (`/admin`) to manage products, inventory, orders, customers, discounts, and roles. Product add/edit supports **image attachments** (file upload) as well as HTTPS URLs.

## Admin (seeded locally)

| Role | Email | Password |
| --- | --- | --- |
| Owner | owner@garmentloop.store | GarmentLoop-Owner-2026 |
| Admin | admin@garmentloop.store | GarmentLoop-Admin-2026 |
| Staff | staff@garmentloop.store | GarmentLoop-Staff-2026 |

Override the owner with `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Customers sign in at `/account/login` with email or mobile number, password (min 8 characters), then a one-time code sent by email or SMS. Staff credentials skip OTP and open the admin console.

Without Resend/Twilio keys, local development shows a preview code. Production requires the API keys in [docs/otp-setup.md](docs/otp-setup.md).

## Product images

On **add** or **edit product**, attach JPEG/PNG/WebP/GIF/AVIF files (up to 4.5 MB) or paste an HTTPS URL.

- Local `npm run dev` stores files in `public/uploads/`.
- On Vercel, set `BLOB_READ_WRITE_TOKEN` ([Vercel Blob](https://vercel.com/docs/storage/vercel-blob)) so uploads persist. You can still paste Unsplash or other HTTPS URLs without Blob.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Zustand · Drizzle ORM · Neon Postgres
