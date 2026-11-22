export const ROLES = ["owner", "admin", "staff"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "dashboard.view",
  "products.manage",
  "categories.manage",
  "collections.manage",
  "inventory.manage",
  "orders.view",
  "orders.manage",
  "customers.view",
  "customers.manage",
  "discounts.manage",
  "users.manage",
  "settings.manage",
  "audit.view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [...PERMISSIONS],
  admin: PERMISSIONS.filter((permission) => permission !== "users.manage"),
  staff: [
    "dashboard.view",
    "inventory.manage",
    "orders.view",
    "orders.manage",
    "customers.view",
  ],
};

export function can(role: Role | undefined, permission: Permission) {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function roleLabel(role: Role) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "Staff";
}
