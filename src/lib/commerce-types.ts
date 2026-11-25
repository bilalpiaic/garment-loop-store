export type ReviewStatus = "pending" | "approved" | "rejected";

export type ProductReview = {
  id: string;
  productId: string;
  productSlug: string;
  authorName: string;
  authorEmail: string;
  customerId?: string;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  createdAt: string;
  moderatedAt?: string;
  adminReply?: string;
  repliedAt?: string;
  /** Optional shopper photo URLs (https, max 3). */
  photoUrls?: string[];
};

export type QuestionStatus = "pending" | "approved" | "rejected";

export type ProductQuestion = {
  id: string;
  productId: string;
  productSlug: string;
  authorName: string;
  authorEmail: string;
  body: string;
  status: QuestionStatus;
  answer?: string;
  answeredAt?: string;
  createdAt: string;
  customerId?: string;
};

export type GiftCard = {
  id: string;
  code: string;
  balancePkr: number;
  initialBalancePkr: number;
  active: boolean;
  createdAt: string;
  note?: string;
};

export type ReturnStatus = "requested" | "approved" | "received" | "restocked" | "rejected" | "refunded";

export const RETURN_REASON_CODES = [
  { code: "size_fit", label: "Size / fit issue" },
  { code: "damaged", label: "Arrived damaged or defective" },
  { code: "wrong_item", label: "Wrong item sent" },
  { code: "changed_mind", label: "Changed mind" },
  { code: "quality", label: "Quality not as expected" },
  { code: "exchange", label: "Exchange for another size/color" },
  { code: "other", label: "Other" },
] as const;

export type ReturnReasonCode = (typeof RETURN_REASON_CODES)[number]["code"];

export type ReturnRequest = {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  customerId?: string;
  items: { variantId: string; productTitle: string; quantity: number }[];
  reason: string;
  reasonCode?: ReturnReasonCode;
  type?: "return" | "exchange";
  status: ReturnStatus;
  createdAt: string;
  updatedAt: string;
  adminNote?: string;
  source?: "customer" | "admin";
};

export type WishlistEntry = {
  productId: string;
  addedAt: string;
};

/** Circular wardrobe — take-back / repair / recycling subscriptions (Phase 3) */

export type TakeBackStatus =
  | "requested"
  | "scheduled"
  | "received"
  | "credited"
  | "rejected"
  | "completed";

export type TakeBackCondition = "good" | "fair" | "worn" | "damaged";

export type TakeBackItem = {
  description: string;
  condition: TakeBackCondition;
  quantity: number;
};

export type TakeBackRequest = {
  id: string;
  customerEmail: string;
  customerName: string;
  customerId?: string;
  phone?: string;
  items: TakeBackItem[];
  preferredPickupDate?: string;
  address?: string;
  city?: string;
  notes?: string;
  status: TakeBackStatus;
  creditEstimatePkr?: number;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type RepairStatus =
  | "requested"
  | "quoted"
  | "scheduled"
  | "in_progress"
  | "ready"
  | "completed"
  | "cancelled";

export type RepairRequest = {
  id: string;
  customerEmail: string;
  customerName: string;
  customerId?: string;
  phone?: string;
  garmentDescription: string;
  issue: string;
  preferredDate?: string;
  status: RepairStatus;
  quotePkr?: number;
  appointmentAt?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type CircularPlanId = "care" | "repair_plus" | "recycle_loop";

export type CircularSubscriptionStatus =
  | "pending"
  | "active"
  | "paused"
  | "cancelled"
  | "past_due";

export type CircularSubscription = {
  id: string;
  planId: CircularPlanId;
  planName: string;
  customerEmail: string;
  customerName: string;
  customerId?: string;
  status: CircularSubscriptionStatus;
  billingInterval: "month" | "year";
  pricePkr: number;
  stripeSubscriptionId?: string;
  stripeSessionId?: string;
  stripeCustomerId?: string;
  /** True when activated without live Stripe Billing (demo / env mock). */
  mock: boolean;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
};
