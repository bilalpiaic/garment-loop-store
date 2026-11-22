# GarmentLoop — Admin Spec

## Auth

- Staff/Owner: `/admin/login` (email + password). Seeded owner/admin/staff in README.
- Shoppers: `/account/login` (OTP). Footer + account login link to Staff / Admin sign in.

## Roles (RBAC)

| Role | Access |
| --- | --- |
| Owner | Full CRUD including Users |
| Admin | Catalog, orders, customers, discounts, content, settings — not Users |
| Staff | Dashboard, orders (manage), inventory, customers (view) |

## Sidebar

Dashboard · Orders · Returns · Products · Reviews · Inventory · Categories · Collections · Customers · Analytics · Discounts · **Content** · Users · Settings

## Owner CRUD (demo store — no required DATABASE_URL)

| Module | Create | Read | Update | Delete/Archive | Bulk / extras |
| --- | --- | --- | --- | --- | --- |
| Products + variants | Yes | Yes | Yes (images, prices, stock, publish/draft) | Archive | Bulk publish/draft/archive; stock syncs inventory movements |
| Categories | Yes | Yes | Yes (inline edit) | Delete | — |
| Collections | Yes | Yes | Yes + **assign products** | Delete | Product assignment panel |
| Inventory | — | Yes + movements | Adjust qty + reason | — | Low-stock filter |
| Orders | — | List/detail + filters | Status, payment, tracking, notes; cancel restocks | — | Bulk status |
| Customers | — | List/profile + orders | Notes, tags, name, phone (owner/admin) | — | — |
| Discounts | Yes | Yes | Yes (inline) | Delete | — |
| Reviews | — | Queue | Approve/reject + **public reply** | Delete | — |
| Returns/RMA | Admin open RMA | Queue | Approve (+restock), reject, restock, refund | — | — |
| Content pages | Seeded | Yes | Edit About/Sustainability/FAQ/Policies | — | Stored in platform state |
| Users | Invite/create | Yes | Role change, activate/deactivate | Deactivate | Owner-only |
| Settings | — | Persistence/Stripe/email status | Store settings form | — | — |
| Dashboard | — | KPIs | — | — | Cards link to filtered lists |

## Deferred (Phase 2+)

CSV import/export, carrier label print, MFA/audit log UI, multi-warehouse, Ctrl+K command palette, saved views, homepage block CMS scheduling.

## Seeds

Owner/Admin/Staff credentials in README. Sample orders + pending review on first boot in demo mode.
