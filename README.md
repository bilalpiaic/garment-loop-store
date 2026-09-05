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

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Zustand · Drizzle ORM · Neon Postgres
