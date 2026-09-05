# GarmentLoop Store

Premium winter apparel storefront for **GarmentLoop** — jackets, knitwear, trousers, and accessories, with guest checkout and cash on delivery for Pakistan.

This is the first working slice of the custom platform: catalog, search, cart, checkout, and order confirmation. Payments and inventory run locally so the shop can be used without Neon, Safepay, or other credentials.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:43123](http://localhost:43123).

```bash
npm run build
npm start
```

Production mode (`npm start`) is the reliable way to shop the full checkout flow.

## What you can do

- Browse the winter collection, categories, and product pages with size/color variants
- Search from the header and filter the shop by category, color, size, and price
- Switch display currency between PKR and USD
- Add to bag, check out as a guest, and place a COD / bank transfer / demo card order
- Confirm the order on WhatsApp

Orders and stock deductions live in server memory for this slice. They reset when the process restarts. Live Postgres (Neon), Auth.js email OTP, and Safepay/PayFast adapters are the next phase.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Zustand

Optional: set `NEXT_PUBLIC_WHATSAPP_NUMBER` (digits only, with country code) to point WhatsApp links at a real number.
