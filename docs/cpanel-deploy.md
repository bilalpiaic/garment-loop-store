# Deploy GarmentLoop on cPanel (garmentloop.com)

This guide covers hosting the **GarmentLoop** Next.js App Router store on a typical cPanel account for **garmentloop.com**. Node.js App / Passenger is the preferred path. A PHP/Apache-only account cannot run the full app.

Repo: https://github.com/bilalpiaic/garment-loop-store  
Preferred Node: **20+** (LTS). Startup file in the repo: `server.js` (Passenger-friendly; respects `PORT`).

---

## Before you start

Confirm with your host (or in cPanel) which of these you have:

| Capability | Where to look | Outcome |
| --- | --- | --- |
| **Setup Node.js App** (Passenger) | cPanel → Software → “Setup Node.js App” / “Node.js Selector” | Use **Path A** below |
| SSH or Terminal | cPanel → Advanced → Terminal / SSH Access | Needed to build on the server (`npm ci && npm run build`) |
| File Manager / FTP only | Files → File Manager | You can upload a prebuilt tree, but still need Node.js App to *run* it |
| PHP + Apache only (no Node) | No Node.js App icon | Use **Path B** (fallback) — do not expect APIs/auth to work as a static site |

You do **not** need to invent API keys. Copy values from your existing Vercel / Neon / Resend / Stripe dashboards into cPanel env vars (names listed below).

---

## Path A — Preferred: cPanel “Setup Node.js App” / Passenger

### 1. DNS for garmentloop.com

Point the domain at the cPanel server (values from your host’s welcome email or cPanel → Domains / Zone Editor):

1. At your domain registrar (or DNS provider), set:
   - **A record** for `@` (garmentloop.com) → the server’s IPv4 address  
   - **A record** or **CNAME** for `www` → same IP, or `garmentloop.com` / the host’s suggested target  
2. In cPanel → **Domains** (or Addon Domains / Parked Domains), attach **garmentloop.com** to the account if it is not already the primary domain.
3. Wait for DNS to propagate (often minutes; can take longer). Check with your host’s DNS tools or `dig garmentloop.com`.

SSL: after DNS resolves, use cPanel → **SSL/TLS Status** or **Let’s Encrypt** to issue a certificate for `garmentloop.com` and `www`.

### 2. What to click in cPanel (Node.js App)

1. Log into **cPanel**.
2. Open **Setup Node.js App** (sometimes under Software → Node.js Selector).
3. Click **Create Application**.
4. Set:
   - **Node.js version:** 20.x or newer  
   - **Application mode:** Production  
   - **Application root:** a folder *outside* or beside `public_html` is ideal, e.g. `garment-loop-app` (matches `.cpanel.yml` deploy path style). Avoid dumping the Next app into a shared PHP docroot if you can.  
   - **Application URL:** `garmentloop.com` (and `www` if the UI offers it; otherwise map www via Domains)  
   - **Application startup file:** `server.js`  
     - Fallback if `server.js` is missing: some panels allow a start command equivalent to `node_modules/next/dist/bin/next start` (ensure `PORT` is not hardcoded to 43123). Prefer `server.js` from this repo.  
5. Click **Create**.
6. Open the app → **Environment variables** (or “Edit”) and add the names from [Environment variables](#environment-variables-names-only) — **values only from your own dashboards; never invent keys**.
7. Note the **virtual environment** activate command the panel shows (used in Terminal).

### 3. Put the app files on the server

Pick one:

**Option 1 — Build on the server (recommended if SSH/Terminal works)**

1. Upload or clone the repo into the Application root (Git Version Control, File Manager zip upload, or SSH `git clone`).
2. In cPanel → **Terminal** (or SSH):

```bash
cd ~/garment-loop-app   # your Application root
# Activate the Node app’s virtualenv if cPanel printed a source .../activate command — run that first
npm ci
npm run build
# Optional Neon schema (only if DATABASE_URL is set):
# npm run db:migrate
```

3. Back in **Setup Node.js App**, click **Restart**.

**Option 2 — Build elsewhere, upload `.next` + deps**

1. On a machine with Node 20+: `npm ci && npm run build`.
2. Upload at least: `package.json`, `package-lock.json`, `server.js`, `next.config.ts`, `public/`, `.next/`, and production `node_modules/` (or upload source and run `npm ci --omit=dev` on the server after upload).  
   Uploading `node_modules` is large; prefer `npm ci` on the server when possible.
3. Set env vars in the Node.js App UI, then **Restart**.

Do **not** commit secrets. Do **not** put `.env` with real keys in git; set variables in the cPanel Node.js App UI (or a server-local `.env` that is not uploaded to GitHub).

### 4. Passenger / `.htaccess` notes

Passenger usually writes or expects an `.htaccess` in the web root that proxies to the Node app. Typical patterns:

- If the Application URL is the domain root, cPanel/Passenger manages the rewrite — leave the generated `.htaccess` alone unless support tells you otherwise.
- If the site still shows PHP default pages, ensure the domain’s document root is the one Passenger bound, or that `.htaccess` in `public_html` contains the Passenger directives your panel generated (e.g. `PassengerEnabled on`, `PassengerAppRoot`, `PassengerStartupFile server.js`). **Copy those from cPanel’s docs for your host** — exact directives vary by LiteSpeed vs Apache.
- Next.js needs the Node process to receive all routes (`/api/*`, `/admin/*`, `/_next/*`). Do not rewrite those away to static PHP files.

`server.js` listens on `process.env.PORT` (Passenger sets this) and binds `0.0.0.0`.

### 5. Smoke-check after Restart

- https://garmentloop.com — storefront loads  
- https://garmentloop.com/shop — catalog  
- Guest checkout / COD still works  
- `/account/login` OTP (needs email env for real inbox delivery)  
- `/admin/login` with your seeded or overridden admin credentials  
- Admin → Settings: Neon vs demo depending on `DATABASE_URL`

---

## Environment variables (names only)

All are optional for a demo-style run; production on your domain should set persistence and email at minimum. Full comments live in the repo `.env.example`. **Do not invent or paste secrets into docs or git.**

### Strongly recommended for production

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Prefer **cPanel MySQL/MariaDB** as `mysql://USER:PASS@localhost:3306/DB` (or Postgres/Neon `postgresql://…`). Do not commit the password. |
| `MYSQL_HOST` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` / `MYSQL_PORT` | Alternative to a MySQL `DATABASE_URL` (same credentials cPanel creates under MySQL® Databases) |
| `RESEND_API_KEY` **or** `SMTP_HOST` + `SMTP_PORT` + `SMTP_USER` + `SMTP_PASS` | Order/return email + customer login OTP |
| `EMAIL_FROM` | From-address (verify domain in Resend for non-owner recipients) |

Create the DB in cPanel → **MySQL® Databases** (database + user + ALL PRIVILEGES). Put credentials only in the server `.env.production` (loaded by `server.js`). Run `npm run db:migrate` once on the host. Admin → Settings should report **MySQL / MariaDB**.

### Payments (optional)

| Name | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe server |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe client |
| `STRIPE_WEBHOOK_SECRET` | `POST /api/stripe/webhook` — point Stripe at `https://garmentloop.com/api/stripe/webhook` |
| `CIRCULAR_SUBSCRIPTIONS_MOCK` | Force mock circular memberships |
| `STRIPE_PRICE_CARE_MONTHLY` / `STRIPE_PRICE_REPAIR_PLUS_MONTHLY` / `STRIPE_PRICE_RECYCLE_LOOP_MONTHLY` | Optional Billing price IDs |

### Admin / auth

| Name | Purpose |
| --- | --- |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Override owner seed |
| `ADMIN_MFA_REQUIRED` | Require TOTP for owner/admin when `1`/`true` |
| `AUTH_SHOW_OTP` | Expose OTP in API/UI (keep off in production) |

### Storefront / analytics / shipping / tax (optional)

| Name | Purpose |
| --- | --- |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | WhatsApp confirm links |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 (consent-gated) |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel (consent-gated) |
| `EASYPOST_API_KEY` + `EASYPOST_FROM_NAME` / `_STREET1` / `_CITY` / `_STATE` / `_ZIP` / `_COUNTRY` / `_PHONE` | Live shipping rates |
| `AVALARA_ACCOUNT_ID` / `AVALARA_LICENSE_KEY` / `AVALARA_COMPANY_CODE` / `AVALARA_ENV` | Avalara tax |
| `TAXJAR_API_KEY` / `TAXJAR_ENV` / `TAXJAR_FROM_*` | TaxJar when Avalara unset |

Also set `NODE_ENV=production` if the panel does not set it automatically.

---

## Path B — Fallback: PHP / Apache only (no Node.js App)

**Next.js App Router cannot be fully static-exported without losing this store’s APIs and auth.** Checkout (`POST /api/checkout`), admin (`/api/admin/*`), customer OTP, Stripe webhooks, shipping/tax quotes, and Neon-backed mutations all need a **Node.js server**.

If your cPanel plan has **no** “Setup Node.js App”:

1. **Best:** Ask the host to enable Node.js / Passenger, or upgrade to a plan that includes it — then follow Path A.  
2. **Keep Vercel for the app, use garmentloop.com via DNS:**  
   - Leave the app on Vercel (`garment-loop-store`).  
   - In Vercel → Project → Domains, add `garmentloop.com` / `www`.  
   - At DNS, set the records Vercel shows (usually A/CNAME to Vercel).  
   - cPanel DNS can stay unused for the site apex if the domain is delegated elsewhere.  
3. **Do not** expect `next export` / “upload HTML to `public_html`” to replace this app. A static dump would break checkout, accounts, and admin.

---

## Credentials we need from you to finish an actual upload

Documentation and the repo `server.js` helper do **not** require your passwords. To **upload and run** the app on *your* cPanel account, someone with access must either:

- Do the clicks in Path A themselves using this guide, **or**
- Share (via a secure channel, not a public issue):  
  - **cPanel login** *or* **FTP/SFTP** host + username + password (or SSH key), **and**  
  - Confirmation that **Setup Node.js App** exists (and preferred Application root path), **and**  
  - Whether **Terminal/SSH** is enabled for `npm ci && npm run build`

Agents and docs will not invent Stripe/Resend/Neon keys; paste those only into the Node.js App environment UI (or a private password manager).

---

## Quick checklist

- [ ] DNS A/CNAME for garmentloop.com → cPanel host (Path A) or Vercel (Path B option 2)  
- [ ] SSL issued for the domain  
- [ ] Node 20+ application created; startup `server.js`  
- [ ] Env vars set (at least `DATABASE_URL` + email for real production)  
- [ ] `npm ci && npm run build` (on server or uploaded artifacts)  
- [ ] Application **Restart**  
- [ ] Smoke-test storefront, checkout, account, admin  

## Related

- Repo README — local run + Vercel  
- `.env.example` — variable comments  
- `.cpanel.yml` — optional Git deploy copy tasks (adjust `DEPLOYPATH` to your home directory)
