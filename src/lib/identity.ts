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
};

export type Customer = {
  id: string;
  email: string;
  phone?: string;
  fullName?: string;
  createdAt: string;
  lastLoginAt?: string;
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

export type InventoryMovement = {
  id: string;
  variantId: string;
  change: number;
  type: "sale" | "restock" | "return" | "manual" | "cancel";
  reason?: string;
  relatedOrderNumber?: string;
  actorId?: string;
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
};

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
};

export const CUSTOMER_COOKIE = "gl_customer";
export const ADMIN_COOKIE = "gl_admin";
/** Temporary storefront OTP until email delivery is wired up. */
export const CUSTOMER_OTP_CODE = "123456";
