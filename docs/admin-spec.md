# GarmentLoop — Admin Spec

## Auth

- Staff/Owner: `/admin/login` (email + password). First owner is seeded only when `ADMIN_EMAIL` + `ADMIN_PASSWORD` are set — **do not display passwords on the login page**.
- Shoppers: `/account/login` (OTP). Footer + account login link to Staff / Admin sign in.
- Production: set `ADMIN_MFA_REQUIRED=1` so owner/admin enroll and verify TOTP.

## Roles (RBAC)

| Role | Access |
| --- | --- |
| Owner | Full CRUD including Users |
| Admin | Catalog, orders, customers, discounts, content, settings — not Users |
| Staff | Dashboard, orders (manage), inventory, customers (view) |

## Sidebar

Dashboard · Orders · Returns · Circular · Products · Reviews · Inventory · Categories · Collections · Customers · Analytics · Discounts · **Content** · Users · **Audit log** · **Security** · Settings

Mobile: full nav via Menu (not a truncated 5-link strip).

## Owner CRUD (works on demo store, cPanel MySQL, or Neon)

All mutations go through `platform.ts` → `mutate` → MySQL `platform_state` when `MYSQL_*` / mysql `DATABASE_URL` is set.

| Module | Create | Read | Update | Delete/Archive | Bulk / extras |
| --- | --- | --- | --- | --- | --- |
| Products + variants | Yes | Yes | Yes (images, prices, stock, publish/draft) | Archive | Bulk publish/draft/archive; stock syncs inventory movements; CSV import/export |
| Categories | Yes | Yes | Yes | Delete | Audited |
| Collections | Yes | Yes | Yes + **assign products** | Delete | Audited |
| Inventory | — | Yes + movements | Adjust qty + reason | — | Low-stock filter |
| Orders | — | List/detail + filters | Status, payment, tracking, notes; cancel restocks | — | Bulk status |
| Customers | — | List/profile + orders | Notes, tags, name, phone (owner/admin) | — | Audited |
| Discounts | Yes | Yes | Yes (inline) | Delete | Audited |
| Reviews | — | Queue | Approve/reject + **public reply** | Delete | Audited |
| Returns/RMA | Admin open RMA | Queue | Approve (+restock), reject, restock, refund (status) | — | Audited; refund is soft (no PSP reverse yet) |
| Content pages | Yes | Yes | Edit About/Sustainability/FAQ/Policies | Delete | MySQL platform_state |
| Users | Invite/create | Yes | Role change, activate/deactivate | Deactivate | Owner-only |
| Settings | — | Persistence/Stripe/email status | Store settings form | — | Shows **MySQL / Neon / demo** mode |
| Analytics | — | Revenue, status breakdown, queues, top products | — | — | Links into filtered admin lists |
| Circular | — | Take-backs / repairs / subscriptions | Status + notes | — | Audited |
| Dashboard | — | KPIs | — | — | Cards link to filtered lists |

## CSV import / MFA / audit

- **CSV:** `/admin/products/import` — validate → preview → commit (owner/admin). Export via `/api/admin/products/export`.
- **MFA:** TOTP on `/admin/security`. Login challenges when enrolled. `ADMIN_MFA_REQUIRED=1` forces owner/admin enroll+verify (staff optional).
- **Audit:** `/admin/audit` lists who/what/when for admin mutations (products, inventory, orders, users, settings, CSV, categories, collections, discounts, customers, content, reviews, returns, circular).

## Deferred (Phase 2+)

Carrier label print (API stub 501), multi-warehouse, Ctrl+K command palette, saved views, homepage block CMS scheduling, Stripe/PSP reverse refunds.

## Seeds

Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` in private env for the first owner. Sample orders + pending review on first boot in demo mode. No hardcoded admin/staff passwords in source.
