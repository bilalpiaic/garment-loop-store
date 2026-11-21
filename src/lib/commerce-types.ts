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
