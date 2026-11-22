import type { Metadata } from "next";
import Link from "next/link";
import { OrderReceipt } from "@/components/order-receipt";
import { ClientOrderLookup } from "@/components/client-order-lookup";
import { StripeOrderConfirm } from "@/components/stripe-order-confirm";
import { Button } from "@/components/ui/button";
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
  searchParams: Promise<{
    stripe?: string;
    session_id?: string;
    payment_intent?: string;
    payment_intent_client_secret?: string;
    redirect_status?: string;
  }>;
}) {
  const { orderNumber } = await params;
  const query = await searchParams;
  const order = await getOrder(orderNumber);
  const emailNote = emailConfigured()
    ? `A confirmation email was sent via ${emailMode()}.`
    : "Email provider not configured — confirmation was logged (mock). Set RESEND_API_KEY or SMTP_* for real delivery.";

  const paymentIntentId = query.payment_intent;
  const sessionId = query.session_id;
  const redirectStatus = query.redirect_status;

  if (query.stripe === "success" && redirectStatus && redirectStatus !== "succeeded" && redirectStatus !== "pending") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-serif text-3xl">Payment not completed</h1>
        <p className="mt-3 text-muted-foreground">
          Stripe reported status “{redirectStatus}”. You can try again — your bag items are on the
          order if stock was reserved.
        </p>
        <Button className="mt-6" render={<Link href={`/order/${orderNumber}/pay`} />}>
          Return to payment
        </Button>
      </div>
    );
  }

  if (
    query.stripe === "success" &&
    (sessionId || paymentIntentId) &&
    (!redirectStatus || redirectStatus === "succeeded" || redirectStatus === "pending")
  ) {
    return (
      <StripeOrderConfirm
        orderNumber={orderNumber}
        sessionId={sessionId}
        paymentIntentId={paymentIntentId}
        initialOrder={order}
      />
    );
  }

  if (order) {
    return <OrderReceipt order={order} emailNote={emailNote} recordPurchase />;
  }
  return <ClientOrderLookup orderNumber={orderNumber} recordPurchase />;
}
