import type { Metadata } from "next";
import { OrderReceipt } from "@/components/order-receipt";
import { ClientOrderLookup } from "@/components/client-order-lookup";
import { getOrder } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Order confirmation",
};

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const order = getOrder(orderNumber);
  if (order) {
    return <OrderReceipt order={order} />;
  }
  return <ClientOrderLookup orderNumber={orderNumber} />;
}
