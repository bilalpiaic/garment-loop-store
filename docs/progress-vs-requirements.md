# GarmentLoop — Progress vs Original Requirements

Audit date: 2026-11-22. Sources: `internal/source-garmentloop-requirements.md`, `internal/source-ecommerce-requirements.md`, living `docs/requirements.md`.

## Scoring method

- **Done** = shipped and demoable without third-party keys (or optional keys with safe fallback)
- **Partial** = core path works; advanced pieces missing
- **Not started** = not in the running demo

**MVP Must %** ≈ share of Must-row cells that are Done (Partial counts half).  
**Full wish list %** ≈ Must + Should + Could (Could weighted lightly).

---

## Storefront

| Area | Source emphasis | Status | Notes |
| --- | --- | --- | --- |
| Homepage hero + collections CTAs | Must | Done | Brand-first full-bleed hero, winter CTA, trust strip |
| Catalog / variants / categories / collections | Must | Done | Seeded winter SKUs |
| Multi-facet filters + sort | Must | Done | Shop + collection filters |
| Search + suggestions | Must | Done | Header search + `/search` |
| PDP gallery, variants, stock, ATC | Must | Done | |
| Wishlist | Must | Done | Guest local + account sync |
| Reviews display + submit | Must | Done | Admin moderation |
| Cart persistent | Must | Done | Zustand + localStorage |
| Guest multi-step checkout | Must | Done | Contact → shipping/pay → review |
| Zone shipping + tax line | Must | Done | Config rates; PK tax estimate |
| Payments COD / bank / card_demo / Stripe | Must | Done | Stripe when keys set |
| Account OTP + orders + returns portal | Must | Done | OTP shown outside production |
| Static pages + policies + consent | Must | Done | Admin content editor |
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
| Password login + RBAC (Owner/Admin/Staff) | Must | Done | Discoverability fixed 2026-11-22 |
| Owner-level module CRUD (forms + bulk) | Must | Done | Products/orders/content/users/etc. hardened 2026-11-22 |
| Dashboard KPIs + low stock | Must | Done | |
| Orders lifecycle | Must | Done | Status transitions, notes |
| Products CRUD + variants | Must | Done | |
| Inventory adjust + low stock | Must | Done | Movement log basic |
| Customers list + profile | Must | Done | |
| Categories / collections CRUD | Must | Done | |
| Discounts / coupons | Must | Done | |
| Analytics basic | Must | Done | |
| Users / invite RBAC | Must | Done | |
| Settings | Must | Done | Persistence mode visible |
| Returns / RMA queue | Must | Done | Approve / restock |
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
| Zero required DB (demo/file/memory) | Done | Neon optional |
| Stripe Checkout + webhook | Partial | Works when keyed; demo otherwise |
| Transactional email | Partial | Resend/SMTP or console mock |
| WhatsApp confirm links | Partial | Env number optional |
| Performance / a11y AA basics | Partial | Tokens + structure; no formal audit |
| GDPR export/delete tooling | Not started | Policy pages only |

---

## Overall %

| Scope | Estimate | Rationale |
| --- | --- | --- |
| **MVP Must items** | **~92%** | Must storefront + owner CRUD admin demoable; remaining Must-adjacent gaps are GA4 wiring, production OTP email, CSV/carriers |
| **Should (Phase 2)** | **~25%** | Webhooks/email paths exist; carriers, autocomplete, CSV, MFA, Avalara not started |
| **Could / Phase 3 wish list** | **~10%** | Circular messaging only; no loyalty, i18n, personalization, BNPL |
| **Blended “full original docs”** | **~55–60%** | Heavy Must coverage lifts average; long Phase 2–3 tail remains |

## Honest top gaps

1. Live carrier rates / prepaid RMA labels  
2. Production customer OTP email (codes shown in non-production only)  
3. Stripe wallets / BNPL / express pay  
4. Tax engine beyond PK estimate  
5. CSV product import, MFA, audit log UI  
6. Circular take-back / repair / recycling subscriptions (productized)  
7. GA4 + marketing pixels beyond consent stub  

## Login UX (2026-11-22)

- **Customers:** `/account/login` — email OTP (dev/demo shows code; production expects email delivery when Resend/SMTP configured).  
- **Staff/Owner:** `/admin/login` — email + password (seeded owner/admin/staff). Linked from footer + account login copy so OTP is not mistaken for admin auth.
