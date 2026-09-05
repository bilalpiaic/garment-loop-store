# GarmentLoop Store

## Setup
- `npm install`
- `npm run dev` starts the store on port 43123
- `npm run build` then `npm start` for production mode
- `npm run lint` for ESLint

## Stack
Next.js App Router, TypeScript, Tailwind, shadcn/ui. Catalog lives in `src/lib/catalog.ts`. Cart is client-side (Zustand + localStorage). Checkout is `POST /api/checkout`.

## Conventions
- TypeScript strict. React function components.
- Validate mutations with Zod. Do not store secrets in source.
- Keep the storefront premium and uncluttered; no dummy lorem.
- Guest checkout and COD must keep working.
