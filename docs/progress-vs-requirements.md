# GarmentLoop — Progress vs Original Requirements

Audit date: 2026-11-22 (post production QA on Neon). Sources: `internal/source-garmentloop-requirements.md`, `internal/source-ecommerce-requirements.md`, living `docs/requirements.md`. QA evidence: [qa-report.md](./qa-report.md).

## Scoring method

- **Done** = shipped and verified (or demoable with safe fallback)
- **Partial** = core path works; advanced pieces missing
- **Not started** = not in the running demo

**MVP Must %** ≈ share of Must-row cells that are Done (Partial counts half).  
**Full wish list %** ≈ Must + Should + Could (Could weighted lightly).

---

## Storefront

| Area | Source emphasis | Status | Notes |
| --- | --- | --- | --- |
| Homepage hero + collections CTAs | Must | Done | Brand-first full-bleed hero polish (2026-11-22); see ui-polish-notes.md |
| Catalog / variants / categories / collections | Must | Done | Seeded + admin CRUD |
| Multi-facet filters + sort | Must | Done | Shop filters verified |
| Search + suggestions | Must | Done | Page + API verified |
| PDP gallery, variants, stock, ATC | Must | Done | PDP verified |
| Wishlist | Must | Done | Guest + account paths |
| Reviews display + submit | Must | Done | Submit → pending moderation |
| Cart persistent | Must | Done | Zustand + localStorage |
| Guest multi-step checkout | Must | Done | COD order GL-0006 on Neon |
| Zone shipping + tax line | Must | Done | Config rates; PK tax estimate |
| Payments COD / bank / card_demo / Stripe | Must | Done | COD verified; Stripe when keyed |
| Account OTP + orders + returns portal | Must | Done | Prod OTP hides `devCode`; RMA via admin |
| Static pages + policies + consent | Must | Done | Content editor |
| SEO meta + Product JSON-LD + sitemap | Must | Done | |
| Address autocomplete | Should | Not started | |
| Express pay / BNPL / wallets | Should–Could | Not started | |
| Live carrier rates | Should | Not started | |
| Avalara / full VAT | Should | Partial | Simple PK estimate only |
| Photo UGC / Q&A | Should–Could | Not started | |
| GA4 ecommerce events | Must hooks | Partial | Consent stub; no GA4 wired |
| Circular take-back / repair subscriptions | Brand Could | Not started | Messaging only |
| i18n / hreflang | Could | Not started | EN + PKR/USD display |
| Personalization | Could | Not started | |

## Admin

| Module | Source emphasis | Status | Notes |
| --- | --- | --- | --- |
| Password login + RBAC (Owner/Admin/Staff) | Must | Done | Discoverability verified on prod |
| Owner-level module CRUD (forms + bulk) | Must | Done | Create/archive/adjust verified |
| Dashboard KPIs + low stock | Must | Done | |
| Orders lifecycle | Must | Done | |
| Products CRUD + variants | Must | Done | Persisted on Neon |
| Inventory adjust + low stock | Must | Done | |
| Customers list + profile | Must | Done | |
| Categories / collections CRUD | Must | Done | |
| Discounts / coupons | Must | Done | QA10 created |
| Analytics basic | Must | Done | |
| Users / invite RBAC | Must | Done | |
| Settings | Must | Done | Shows Neon mode |
| Returns / RMA queue | Must | Done | RMA for GL-0006 |
| Reviews moderation | Must | Done | |
| Content pages editor | Must | Done | |
| CSV import/export | Should | Not started | |
| Carrier label print / webhooks | Should | Not started | |
| MFA / audit log UI | Should | Not started | |
| Gift cards / loyalty | Could | Not started | |
| Multi-warehouse / 3PL | Could | Not started | |
| Full BI / ERP sync | Could | Not started | |

## Integrations & NFR

| Area | Status | Notes |
| --- | --- | --- |
| Zero required DB locally | Done | Demo/file/memory without `DATABASE_URL` |
| Neon on Vercel production | Done | Confirmed Settings + SQL persistence |
| Stripe Checkout + webhook | Partial | Works when keyed; demo otherwise |
| Transactional email | Partial | Resend/SMTP or mock; prod OTP needs mail |
| WhatsApp confirm links | Partial | Env number optional |
| Performance / a11y AA basics | Partial | Brand atmosphere + reduced-motion; no formal audit |
| Theme / visual system | Must | Done | Soft Cream atmosphere, Olive Deep admin, Rust sale, motion — ui-polish-notes.md |
| GDPR export/delete tooling | Not started | Policy pages only |

---

## Overall %

| Scope | Estimate | Rationale |
| --- | --- | --- |
| **MVP Must items** | **~93%** | Neon prod + full Must storefront/admin verified in QA; residual Must-adjacent: GA4 wiring + production OTP email delivery |
| **Should (Phase 2)** | **~28%** | Neon + webhooks/email paths lift slightly; carriers, autocomplete, CSV, MFA, Avalara still open |
| **Could / Phase 3 wish list** | **~10%** | Circular messaging only; no loyalty, i18n, personalization, BNPL |
| **Blended “full original docs”** | **~58–62%** | Must coverage + Neon production; long Phase 2–3 tail remains |

## Honest top gaps

1. Production customer OTP **email delivery** (codes hidden in prod until Resend/SMTP)  
2. Live carrier rates / prepaid RMA labels  
3. Stripe wallets / BNPL / express pay  
4. Tax engine beyond PK estimate  
5. CSV product import, MFA, audit log UI  
6. Circular take-back / repair / recycling subscriptions (productized)  
7. GA4 + marketing pixels beyond consent stub  

## Login UX

- **Customers:** `/account/login` — email OTP (production: no `devCode` in API)  
- **Staff/Owner:** `/admin/login` — email + password; linked from footer + account login
