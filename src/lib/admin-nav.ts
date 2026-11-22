import type { Permission } from "@/lib/roles";

export const ADMIN_NAV: {
  href: string;
  label: string;
  permission: Permission;
}[] = [
  { href: "/admin", label: "Dashboard", permission: "dashboard.view" },
  { href: "/admin/orders", label: "Orders", permission: "orders.view" },
  { href: "/admin/returns", label: "Returns", permission: "orders.manage" },
  { href: "/admin/products", label: "Products", permission: "products.manage" },
  { href: "/admin/reviews", label: "Reviews", permission: "products.manage" },
  { href: "/admin/inventory", label: "Inventory", permission: "inventory.manage" },
  { href: "/admin/categories", label: "Categories", permission: "categories.manage" },
  { href: "/admin/collections", label: "Collections", permission: "collections.manage" },
  { href: "/admin/customers", label: "Customers", permission: "customers.view" },
  { href: "/admin/analytics", label: "Analytics", permission: "dashboard.view" },
  { href: "/admin/discounts", label: "Discounts", permission: "discounts.manage" },
  { href: "/admin/content", label: "Content", permission: "products.manage" },
  { href: "/admin/users", label: "Users", permission: "users.manage" },
  { href: "/admin/audit", label: "Audit log", permission: "audit.view" },
  { href: "/admin/security", label: "Security", permission: "dashboard.view" },
  { href: "/admin/settings", label: "Settings", permission: "settings.manage" },
];

export function formatPkr(amount: number) {
  return `PKR ${new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
