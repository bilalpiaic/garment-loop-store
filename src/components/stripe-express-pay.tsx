"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Order } from "@/lib/order-model";
import { formatMoney } from "@/lib/money";

function PayForm({ order }: { order: Order }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [expressReady, setExpressReady] = useState(false);

  async function finalize(paymentIntentId: string, status?: string) {
    if (status === "processing") {
      try {
        const { useCartStore } = await import("@/store/store");
        useCartStore.getState().clear();
      } catch {
        /* ignore */
      }
      router.push(
        `/order/${order.orderNumber}?stripe=success&payment_intent=${paymentIntentId}&redirect_status=pending`,
      );
      return;
    }

    const response = await fetch("/api/stripe/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber: order.orderNumber, paymentIntentId }),
    });
    const data = (await response.json()) as { error?: string; processing?: boolean };
    if (response.status === 202 || data.processing) {
      try {
        const { useCartStore } = await import("@/store/store");
        useCartStore.getState().clear();
      } catch {
        /* ignore */
      }
      router.push(
        `/order/${order.orderNumber}?stripe=success&payment_intent=${paymentIntentId}&redirect_status=pending`,
      );
      return;
    }
    if (!response.ok) {
      throw new Error(data.error ?? "Could not confirm payment.");
    }
    try {
      const { useCartStore } = await import("@/store/store");
      useCartStore.getState().clear();
    } catch {
      /* ignore */
    }
    router.push(
      `/order/${order.orderNumber}?stripe=success&payment_intent=${paymentIntentId}&redirect_status=succeeded`,
    );
  }

  async function onExpressConfirm(event: StripeExpressCheckoutElementConfirmEvent) {
    if (!stripe || !elements) {
      event.paymentFailed({ reason: "fail" });
      return;
    }
    setPending(true);
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order/${order.orderNumber}?stripe=success`,
          payment_method_data: {
            billing_details: {
              name: order.customer.fullName,
              email: order.customer.email,
              phone: order.customer.phone,
            },
          },
        },
        redirect: "if_required",
      });
      if (result.error) {
        event.paymentFailed({ reason: "fail" });
        toast.error(result.error.message ?? "Wallet payment failed.");
        return;
      }
      const status = result.paymentIntent?.status;
      if (status === "succeeded" || status === "processing") {
        await finalize(result.paymentIntent!.id, status);
        return;
      }
      // Redirect-based wallets / BNPL leave the page via return_url.
    } catch (error) {
      event.paymentFailed({ reason: "fail" });
      toast.error(error instanceof Error ? error.message : "Wallet payment failed.");
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setPending(true);
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order/${order.orderNumber}?stripe=success`,
          payment_method_data: {
            billing_details: {
              name: order.customer.fullName,
              email: order.customer.email,
              phone: order.customer.phone,
            },
          },
        },
        redirect: "if_required",
      });
      if (result.error) {
        toast.error(result.error.message ?? "Payment failed.");
        return;
      }
      const status = result.paymentIntent?.status;
      if (status === "succeeded" || status === "processing") {
        await finalize(result.paymentIntent!.id, status);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className={expressReady ? "space-y-3" : "hidden"}>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Express checkout</p>
        <ExpressCheckoutElement
          onConfirm={onExpressConfirm}
          onReady={({ availablePaymentMethods }) => {
            const any =
              Boolean(availablePaymentMethods?.applePay) ||
              Boolean(availablePaymentMethods?.googlePay) ||
              Boolean(availablePaymentMethods?.link) ||
              Boolean(availablePaymentMethods?.paypal) ||
              Boolean(availablePaymentMethods?.amazonPay);
            setExpressReady(any);
          }}
        />
        <div className="relative py-2 text-center text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <span className="bg-background px-3">or pay with</span>
          <span className="absolute inset-x-0 top-1/2 -z-10 h-px bg-border" />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Card · wallets · BNPL
        </p>
        <PaymentElement
          options={{
            layout: "tabs",
            business: { name: "GarmentLoop" },
          }}
        />
        <p className="text-xs text-muted-foreground">
          Apple Pay, Google Pay, Link, Klarna, and Afterpay appear when enabled on your Stripe
          account and eligible for this currency / region. Charges are processed in USD (converted
          from PKR when needed).
        </p>
      </div>

      <Button type="submit" className="h-11 w-full" disabled={!stripe || pending}>
        {pending ? "Processing…" : `Pay ${formatMoney(order.totalPkr, order.currency)}`}
      </Button>
    </form>
  );
}

export function StripeExpressPay({
  order,
  clientSecret,
  publishableKey,
}: {
  order: Order;
  clientSecret: string;
  publishableKey: string;
}) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Secure payment</p>
      <h1 className="mt-2 font-serif text-4xl">Pay for {order.orderNumber}</h1>
      <p className="mt-2 text-muted-foreground">
        Total {formatMoney(order.totalPkr, order.currency)} · {order.customer.email}
      </p>
      <div className="mt-8 rounded-xl border bg-card p-5">
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary: "#3d5a45",
                borderRadius: "8px",
              },
            },
          }}
        >
          <PayForm order={order} />
        </Elements>
      </div>
    </div>
  );
}
