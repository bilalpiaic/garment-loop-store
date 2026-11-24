# GarmentLoop Store

## Setup
- `npm install`
- `npm run dev` starts the store on port 43123
- `npm run build` then `npm start` for production mode
- `npm run lint` for ESLint

## Stack
Next.js App Router, TypeScript, Tailwind, shadcn/ui. Catalog persists via **MySQL** (`mysql://` / `MYSQL_*`, cPanel garmentloop.com), **Neon/Postgres** (`postgresql://`, Vercel option), or the demo memory/file store when unset; seeded from `src/lib/catalog.ts`. Cart is client-side (Zustand + localStorage). Checkout is `POST /api/checkout`. Customer accounts use email OTP. Admin uses password login with Owner / Admin / Staff roles at `/admin` — **never render seed passwords on the login page**.

## Conventions
- TypeScript strict. React function components.
- Validate mutations with Zod. Do not store secrets in source.
- Keep the storefront premium and uncluttered; no dummy lorem.
- Guest checkout and COD must keep working.
- Protect `/admin/*` APIs with `requireAdmin` and a role permission.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
