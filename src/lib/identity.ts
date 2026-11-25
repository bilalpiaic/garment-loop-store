import type { Role } from "@/lib/roles";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
  /** Base32 TOTP secret when MFA is enrolled. Never expose to clients. */
  mfaSecret?: string;
  mfaEnabled?: boolean;
  mfaEnabledAt?: string;
};

export type MfaChallenge = {
  id: string;
  userId: string;
  /** password_ok → needs TOTP; setup → enrollment before full session */
  purpose: "verify" | "setup";
  /** Pending secret while completing setup at login */
  pendingSecret?: string;
  expiresAt: string;
  createdAt: string;
};

export type Customer = {
  id: string;
  email: string;
  phone?: string;
  fullName?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  lastLoginAt?: string;
  /** Demo loyalty: 1 point per PKR 100 on delivered orders. */
  loyaltyPoints?: number;
  /** Set when GDPR anonymize runs — email becomes a hashed placeholder. */
  anonymizedAt?: string;
};

export type CustomerAddress = {
  id: string;
  customerId: string;
  fullName: string;
  phone: string;
  country: string;
  city: string;
  area: string;
  address: string;
  postalCode?: string;
  isDefault: boolean;
};

export type SessionRecord = {
  id: string;
  kind: "customer" | "admin";
  userId: string;
  expiresAt: string;
  createdAt: string;
};

export type OtpChallenge = {
  email: string;
  codeHash: string;
  expiresAt: string;
  attempts: number;
  createdAt: string;
};

export type Discount = {
  id: string;
  code: string;
  description: string;
  type: "percentage" | "fixed";
  value: number;
  minOrderPkr?: number;
  usageLimit?: number;
  usedCount: number;
  expiresAt?: string;
  active: boolean;
};

export type Warehouse = {
  id: string;
  name: string;
  city?: string;
  country?: string;
};

export type InventoryMovement = {
  id: string;
  variantId: string;
  change: number;
  type: "sale" | "restock" | "return" | "manual" | "cancel";
  reason?: string;
  relatedOrderNumber?: string;
  actorId?: string;
  /** Optional warehouse for demo multi-location; stock totals stay aggregate. */
  warehouseId?: string;
  createdAt: string;
};

export type StoreSettings = {
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  whatsapp: string;
  freeShippingThresholdPkr: number;
  domesticShippingPkr: number;
  internationalShippingPkr: number;
  usdRate: number;
  lowStockThreshold: number;
  /** Demo multi-warehouse locations; inventory remains globally aggregated. */
  warehouses?: Warehouse[];
};

export const DEFAULT_WAREHOUSES: Warehouse[] = [
  { id: "lahore-main", name: "Lahore main", city: "Lahore", country: "PK" },
  { id: "karachi-overflow", name: "Karachi overflow", city: "Karachi", country: "PK" },
];

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "GarmentLoop",
  supportEmail: "hello@garmentloop.store",
  supportPhone: "+92 300 1234567",
  whatsapp: "923001234567",
  freeShippingThresholdPkr: 8000,
  domesticShippingPkr: 300,
  internationalShippingPkr: 7000,
  usdRate: 278,
  lowStockThreshold: 5,
  warehouses: DEFAULT_WAREHOUSES,
};

export const CUSTOMER_COOKIE = "gl_customer";
export const ADMIN_COOKIE = "gl_admin";
export const ADMIN_MFA_COOKIE = "gl_admin_mfa";
