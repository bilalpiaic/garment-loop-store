import type { Product, ProductVariant } from "@/lib/catalog";
import { lowestPrice } from "@/lib/catalog";
import type { Order, OrderLine } from "@/lib/order-model";

export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
};

export function productToItem(product: Product, quantity = 1): AnalyticsItem {
  return {
    item_id: product.id,
    item_name: product.title,
    item_category: product.category,
    price: lowestPrice(product),
    quantity,
  };
}

export function variantToItem(
  product: Product,
  variant: ProductVariant,
  quantity = 1,
): AnalyticsItem {
  return {
    item_id: product.id,
    item_name: product.title,
    item_category: product.category,
    item_variant: `${variant.color} / ${variant.size}`,
    price: variant.salePricePkr ?? variant.pricePkr,
    quantity,
  };
}

export function orderLineToItem(line: OrderLine): AnalyticsItem {
  return {
    item_id: line.productId,
    item_name: line.productTitle,
    item_variant: `${line.color} / ${line.size}`,
    price: line.unitPricePkr,
    quantity: line.quantity,
  };
}

export function orderToItems(order: Order): AnalyticsItem[] {
  return order.items.map(orderLineToItem);
}

/** Meta Pixel content_ids prefer SKU/variant or product ids. */
export function metaContentIds(items: AnalyticsItem[]) {
  return items.map((item) => item.item_id);
}
