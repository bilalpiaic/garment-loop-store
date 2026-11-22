# GarmentLoop — Consolidated Requirements

Merged from GarmentLoop brand/admin spec + ecommerce MVP prioritization. Brand name is **GarmentLoop** everywhere (ignore “Atlas Goods”).

Priorities: **Must** = Phase 1 MVP · **Should** = Phase 2 · **Could** = Phase 3+

---

## Business goals

| Goal | Metric direction |
| --- | --- |
| Revenue & AOV | Conversion, revenue/visitor |
| Loyalty | Repeat purchase, account opt-in |
| Brand | Circular atelier recognition, trust signals |
| Ops | Order cycle time, stock accuracy |

**Personas:** design-conscious shopper (mobile-first, sustainability); busy guest checkout shopper; admin/ops/merch/support staff.

---

## Storefront

| Area | Must (MVP) | Should | Could |
| --- | --- | --- | --- |
| Homepage | Full-bleed hero, curated collection CTAs, trust signals, featured products | Editorial CMS blocks, scheduled banners | Personalized “trending in your size” |
| Catalog | Products + variants (size/color), categories, curated collections | Smart collections by tag | Localized PIM attributes |
| Browse | Multi-facet filters (multi-select color/size/category), sort, price | Filter counts, zero-result pruning | Saved searches |
| Search | Header search with suggestions | Spell-correct / AI suggest | — |
| PDP | Images, variants, stock, add to cart, **wishlist**, **reviews** | Zoom, size guide tabs | 360° / video |
| Cart | Persistent cart, qty edit, remove, subtotal, shipping estimate | Cross-sell, email reminder | — |
| Checkout | Guest checkout; **zone shipping options**; **tax line**; order confirm | Address autocomplete; express pay | One-page checkout |
| Payments | COD, bank, **card_demo**; **Stripe Checkout when env keys set** | Webhooks, Apple/Google Pay, BNPL | Crypto |
| Shipping | **Config zone rates** (PK standard/express, GCC, intl) + free threshold | Live carrier rates/labels | Multi-warehouse routing |
| Wishlist | Guest local + account sync | Shared lists | — |
| Reviews | Submit + approved display | Photo UGC, Q&A | Incentives |
| Account | Email OTP login; order history; profile shell | Addresses CRUD | **Circular take-back / repair / recycling subscriptions** (MVP); loyalty points later |
| Content | About, FAQ, Contact, **Sustainability**, **Policies**, consent banner | Richer CMS | Blog / multilingual |
| SEO / a11y | Clean URLs, meta, Product JSON-LD, sitemap, WCAG AA basics | BreadcrumbList, OpenGraph polish | hreflang |
| Analytics | Hook points for GA4 ecommerce events | GTM, Meta Pixel + consent | Full BI |

### Storefront acceptance (MVP)

- Browse New Arrivals / Winter / Essentials → correct product set and counts.
- Filters update the grid without losing context.
- PDP shows variants, price, stock; Add to Cart updates badge.
- Guest can complete checkout with validation; confirmation shows order number.
- Returning customer can OTP-login and see past orders.

---

## Admin

| Module | Must (MVP) | Should | Could |
| --- | --- | --- | --- |
| Dashboard | KPI cards + **low-stock alert banner** | Role-specific widgets | Alerts automation |
| Orders | List/filter, detail, status transitions, notes | Bulk labels, partial ship, carrier webhooks | ERP sync |
| Products | CRUD, variants, draft/publish, images | CSV import/export with validation | Full PIM |
| Inventory | Per-SKU stock adjust, low-stock visibility | Multi-warehouse, movement log | 3PL |
| Customers | List, profile, order history | Tags, GDPR export/delete | Ticketing |
| Categories / Collections | CRUD for merchandising | Pin/reorder products | Smart rules |
| Discounts | Coupon codes (% / fixed) | Auto rules, gift cards, analytics | Loyalty |
| Analytics | Basic sales / top products views | Export CSV/PDF | BI embed |
| Users / RBAC | Owner / Admin / Staff + permissions | MFA, IP lockout, audit log UI | Custom roles |
| Settings | Store name, shipping thresholds, currency helpers | Tax/payment gateway config | Webhooks / apps |
| Returns | **Customer portal** + admin RMA (approve restocks) | Prepaid labels | Store credit ledger |
| Content | **Admin content editor** for policy/sustainability pages | Block CMS | FAQ module |
| Reviews | **Moderation queue** (approve/reject) | Public reply, photo UGC | Incentivized UGC |

### Admin acceptance (MVP)

- Staff can filter orders by status and open detail.
- Merchandiser can create/edit product + variants and adjust stock.
- Restricted role cannot open Users/Settings; Owner can invite/manage users.
- Dashboard links into filtered lists where implemented.

---

## Non-functional

| Area | Must | Later |
| --- | --- | --- |
| Performance | Reasonable LCP on catalog; optimized images | Core Web Vitals “good” everywhere |
| Security | HTTPS, Zod validation, hashed admin passwords, no card storage | MFA, audit log export, OWASP hardening |
| Privacy | Minimal PII; privacy/terms pages | GDPR export/delete tooling |
| i18n | English; PKR/USD display | Multi-locale / VAT |

---

## Explicit TODOs (remaining)

1. **Stripe wallets / BNPL** (Checkout Session + webhooks shipped; `card_demo` fallback remains).
2. **Carriers** — EasyPost or UPS/FedEx for live rates + labels; tracking webhooks.
3. **Tax engine** — Avalara / VAT beyond PK 5% estimate.
4. **Auth OTP email keys on Vercel** — `sendLoginOtpEmail` ships with Resend/SMTP; set `RESEND_API_KEY` or `SMTP_*` + `EMAIL_FROM` for inbox delivery (API no longer returns `devCode` in production unless `AUTH_SHOW_OTP`).
5. **Prepaid RMA labels** for customer returns (portal + admin queue shipped).

See [roadmap.md](./roadmap.md) for phasing.
