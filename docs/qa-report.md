# GarmentLoop — Production QA Report

> **Current host (2026-11-24):** https://garmentloop.com runs on cPanel with **MySQL/MariaDB** (PR #12). `/admin/login` no longer shows a Demo credentials box (`LIVE_OK`). The table below remains the **2026-11-22 Vercel/Neon** QA snapshot.

**Date:** 2026-11-22  
**Production (then):** https://garment-loop-store.vercel.app  
**Deploy:** `dpl_4FFbW1e43XHCRH6DB7jsG6FyPBx8` · GitHub `main` `3507b1a` · **READY**  
**Method:** Authenticated HTTP probes (owner login) + Neon SQL checks. No secrets recorded.

## Environment

| Check | Result |
| --- | --- |
| Production READY on tip | Pass — alias includes `garment-loop-store.vercel.app` |
| Admin Settings data store | Pass — **Neon Postgres (DATABASE_URL set)** |
| Neon project | `garmentloop` / `billowing-dust-18918846` |
| Persist product create | Pass — product visible on storefront PDP; present in `platform_state` |
| Persist COD order | Pass — `GL-0006` in Neon `orders` (confirmed, COD) |
| GitHub Neon docs PR #1 | Merged (squash → `2baf400`) |

## Summary

| Result | Count |
| --- | --- |
| Pass | 43 |
| Fail | 0 |
| Blocked | 0 (returns exercised via admin RMA after COD order) |

---

## Storefront

| Area | Status | Notes |
| --- | --- | --- |
| Home | Pass | Brand + winter CTAs; 200 |
| Shop + filters | Pass | `/shop`, `/shop?category=coats` |
| Search | Pass | Page + `/api/search?q=coat` |
| PDP | Pass | QA product PDP; Add to bag |
| Wishlist | Pass | Page 200; API guest `{ok:true,authenticated:false}` |
| Reviews submit | Pass | Submitted pending moderation |
| Cart | Pass | Page 200 |
| Multi-step checkout UI | Pass | Contact / Shipping / Review markers |
| Checkout COD | Pass | Order **GL-0006** + confirmation page |
| Sustainability / FAQ | Pass | Content pages render |
| Account OTP (production) | Pass | `ok:true` **without** `devCode` — expects email when Resend/SMTP set |
| Auth discoverability | Pass | Footer + `/account/login` show **Staff / Admin sign in** |

## Admin (owner@garmentloop.store)

| Area | Status | Notes |
| --- | --- | --- |
| Login email+password | Pass | `/admin/login` + API |
| Dashboard | Pass | Authenticated 200 |
| Products CRUD | Pass | Create → list → PDP → archive |
| Categories | Pass | Page 200 |
| Collections | Pass | Page 200 |
| Inventory adjust | Pass | +1 with reason on QA variant |
| Orders | Pass | List/detail pages; COD order visible |
| Customers | Pass | List API |
| Discounts | Pass | Created coupon QA10 |
| Reviews | Pass | Admin list API |
| Returns / RMA | Pass | Created RMA for GL-0006 |
| Content | Pass | Pages API |
| Users | Pass | Owner present |
| Settings | Pass | Neon mode shown; save ok |
| Analytics | Pass | Page 200 |

---

## Blockers before theme/UI work

None for functional demo. Optional follow-ups (not blockers):

1. Wire production OTP **email delivery** (Resend/SMTP) so shoppers receive codes.
2. Formal a11y / Lighthouse pass (not run this session).
3. Phase 2: carriers, CSV, MFA, GA4.

## Artifacts

- QA product id (archived after test): `prd-qa-20261122140800`
- Sample order: `GL-0006`
- Coupon created: `QA10`
