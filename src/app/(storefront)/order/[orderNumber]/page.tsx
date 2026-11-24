import Link from "next/link";
import { OrderReceipt } from "@/components/order-receipt";
import { OrderEmailLookup } from "@/components/order-email-lookup";
import { StripeOrderConfirm } from "@/components/stripe-order-confirm";
import { Button } from "@/components/ui/button";
import { authorizeOrderAccess, publicOrderView } from "@/lib/order-access";
import { emailConfigured, emailMode } from "@/lib/email";
import { pageMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "Order confirmation",
  description: "GarmentLoop order confirmation.",
  path: "/order",
  index: false,
});

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{
    t?: string;
    email?: string;
    stripe?: string;
    session_id?: string;
    payment_intent?: string;
    payment_intent_client_secret?: string;
    redirect_status?: string;
  }>;
}) {
  const { orderNumber } = await params;
  const query = await searchParams;
  const emailNote = emailConfigured()
    ? `A confirmation email was sent via ${emailMode()}.`
    : "Email provider not configured — confirmation was logged (mock). Set RESEND_API_KEY or SMTP_* for real delivery.";

  const paymentIntentId = query.payment_intent;
  const sessionId = query.session_id;
  const redirectStatus = query.redirect_status;
  const tokenSuffix = query.t ? `?t=${encodeURIComponent(query.t)}` : "";

  if (query.stripe === "success" && redirectStatus && redirectStatus !== "succeeded" && redirectStatus !== "pending") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-serif text-3xl">Payment not completed</h1>
        <p className="mt-3 text-muted-foreground">
          Stripe reported status “{redirectStatus}”. You can try again — your bag items are on the
          order if stock was reserved.
        </p>
        <Button className="mt-6" render={<Link href={`/order/${orderNumber}/pay${tokenSuffix}`} />}>
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
    const access = await authorizeOrderAccess(orderNumber, {
      token: query.t,
      email: query.email,
    });
    return (
      <StripeOrderConfirm
        orderNumber={orderNumber}
        sessionId={sessionId}
        paymentIntentId={paymentIntentId}
        initialOrder={access.ok ? publicOrderView(access.order) : null}
      />
    );
  }

  const access = await authorizeOrderAccess(orderNumber, {
    token: query.t,
    email: query.email,
  });

  if (access.ok) {
    return (
      <OrderReceipt order={publicOrderView(access.order)} emailNote={emailNote} recordPurchase />
    );
  }

  return <OrderEmailLookup orderNumber={orderNumber} recordPurchase />;
}
