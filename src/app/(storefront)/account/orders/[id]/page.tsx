import { notFound, redirect } from "next/navigation";
import { OrderReceipt } from "@/components/order-receipt";
import { getCustomerSession, getOrder } from "@/lib/platform";

export const metadata = { title: "Order" };

export default async function AccountOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login");
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const owns =
    order.customerId === session.customer.id ||
    order.customer.email.toLowerCase() === session.customer.email;
  if (!owns) notFound();
  return <OrderReceipt order={order} />;
}
