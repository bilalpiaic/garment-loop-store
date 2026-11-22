import type { Metadata } from "next";
import { OrderReceipt } from "@/components/order-receipt";
import { ClientOrderLookup } from "@/components/client-order-lookup";
import { StripeOrderConfirm } from "@/components/stripe-order-confirm";
import { getOrder } from "@/lib/orders";
import { emailConfigured, emailMode } from "@/lib/email";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order confirmation",
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ stripe?: string; session_id?: string }>;
}) {
  const { orderNumber } = await params;
  const query = await searchParams;
  const order = await getOrder(orderNumber);
  const emailNote = emailConfigured()
    ? `A confirmation email was sent via ${emailMode()}.`
    : "Email provider not configured — confirmation was logged (mock). Set RESEND_API_KEY or SMTP_* for real delivery.";

  if (query.stripe === "success" && query.session_id) {
    return (
      <StripeOrderConfirm
        orderNumber={orderNumber}
        sessionId={query.session_id}
        initialOrder={order}
      />
    );
  }

  if (order) {
    return <OrderReceipt order={order} emailNote={emailNote} />;
  }
  return <ClientOrderLookup orderNumber={orderNumber} />;
}
