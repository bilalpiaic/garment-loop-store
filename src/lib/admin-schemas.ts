import { z } from "zod";

export const productSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().trim().min(2),
  subtitle: z.string().trim().min(2),
  description: z.string().trim().min(8),
  features: z.array(z.string()),
  specs: z.array(z.object({ label: z.string(), value: z.string() })),
  category: z.string().min(1),
  collections: z.array(z.string()),
  images: z
    .array(z.object({ src: z.string().url(), alt: z.string() }))
    .min(1, "Add at least one image URL."),
  variants: z
    .array(
      z.object({
        id: z.string().min(1),
        sku: z.string().min(1),
        color: z.string().min(1),
        colorHex: z.string().min(4),
        size: z.string().min(1),
        pricePkr: z.number().int().positive(),
        salePricePkr: z.number().int().positive().optional(),
        stock: z.number().int().min(0),
      }),
    )
    .min(1, "Add at least one variant."),
  featured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export const categorySchema = z.object({
  slug: z.string().min(1),
  name: z.string().trim().min(2),
  description: z.string().trim().min(4),
  image: z.string().url(),
});

export const collectionSchema = categorySchema;

export const discountSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(3),
  description: z.string().trim().min(2),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().positive(),
  minOrderPkr: z.number().int().min(0).optional(),
  usageLimit: z.number().int().positive().optional(),
  expiresAt: z.string().optional(),
  active: z.boolean(),
});

export const inventorySchema = z.object({
  variantId: z.string().min(1),
  change: z.number().int().refine((value) => value !== 0, "Change cannot be zero."),
  reason: z.string().trim().optional(),
  warehouseId: z.string().trim().min(1).optional(),
});

export const orderPatchSchema = z.object({
  status: z
    .enum([
      "pending",
      "confirmed",
      "processing",
      "packed",
      "shipped",
      "delivered",
      "cancelled",
      "returned",
    ])
    .optional(),
  paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]).optional(),
  trackingNumber: z.string().optional(),
  courier: z.string().optional(),
  notes: z.string().optional(),
});

export const adminUserSchema = z.object({
  id: z.string().optional(),
  email: z.string().trim().email(),
  name: z.string().trim().min(2),
  role: z.enum(["owner", "admin", "staff"]),
  password: z.string().min(8).optional(),
  active: z.boolean().optional(),
});

export const customerPatchSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().trim().min(2).optional(),
  phone: z.string().trim().min(6).optional(),
  notes: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export const productBulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  status: z.enum(["draft", "published", "archived"]),
});

export const orderBulkSchema = z.object({
  orderNumbers: z.array(z.string().min(1)).min(1),
  status: z.enum([
    "pending",
    "confirmed",
    "processing",
    "packed",
    "shipped",
    "delivered",
    "cancelled",
    "returned",
  ]),
});

export const collectionAssignSchema = z.object({
  slug: z.string().min(1),
  productIds: z.array(z.string().min(1)),
});

export const settingsSchema = z.object({
  storeName: z.string().trim().min(2).optional(),
  supportEmail: z.string().trim().email().optional(),
  supportPhone: z.string().trim().min(6).optional(),
  whatsapp: z.string().trim().min(8).optional(),
  freeShippingThresholdPkr: z.number().int().min(0).optional(),
  domesticShippingPkr: z.number().int().min(0).optional(),
  internationalShippingPkr: z.number().int().min(0).optional(),
  usdRate: z.number().positive().optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
});

export const addressSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().trim().min(3),
  phone: z.string().trim().min(10),
  country: z.string().min(2),
  city: z.string().trim().min(2),
  area: z.string().trim().min(2),
  address: z.string().trim().min(8),
  isDefault: z.boolean().optional(),
});
