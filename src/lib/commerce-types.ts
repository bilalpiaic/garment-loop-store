export type ReturnRequestStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "received"
  | "restocked"
  | "refunded";

export type ReturnRequest = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  reason: string;
  reasonCode?: string;
  type?: "refund" | "exchange" | "store_credit";
  source?: "admin" | "customer";
  status: ReturnRequestStatus;
  createdAt: string;
  updatedAt: string;
  items: {
    variantId: string;
    productId: string;
    productTitle: string;
    quantity: number;
  }[];
};

export type ProductReview = {
  id: string;
  productId: string;
  productSlug: string;
  authorName: string;
  authorEmail: string;
  rating: number;
  title: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};
