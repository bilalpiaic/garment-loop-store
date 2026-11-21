"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";
import { checkoutSchema } from "@/lib/checkout-schema";
import { getVariant } from "@/lib/catalog";
import { listShippingOptions } from "@/lib/shipping";
import { estimateTaxPkr } from "@/lib/tax";
import { useCartStore, usePreferenceStore } from "@/store/store";
import { useCatalog } from "@/components/catalog-provider";
import type { CustomerAddress } from "@/lib/identity";
import { CheckoutFormMainColumn } from "@/components/checkout-form-main";
import { CheckoutFormSummary } from "@/components/checkout-form-summary";

type PaymentId = "cod" | "bank_transfer" | "card_demo" | "stripe";

export function CheckoutForm({
  defaults,
  stripeEnabled = false,
}: {
  defaults?: {
    fullName?: string;
    email?: string;
    phone?: string;
    address?: CustomerAddress;
  };
  stripeEnabled?: boolean;
}) {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clear = useCartStore((state) => state.clear);
  const currency = usePreferenceStore((state) => state.currency);
  const { products } = useCatalog();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [country, setCountry] = useState(defaults?.address?.country ?? "PK");
  const [paymentMethod, setPaymentMethod] = useState<PaymentId>("cod");
  const [shippingMethodId, setShippingMethodId] = useState("pk-standard");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const steps = [
    { id: 1 as const, label: "Contact & address" },
    { id: 2 as const, label: "Shipping & payment" },
    { id: 3 as const, label: "Review" },
  ];

  const payments = useMemo(() => {
    const list: { id: PaymentId; title: string; detail: string }[] = [
      {
        id: "cod",
        title: "Cash on delivery",
        detail: "Pay when your order arrives. Pakistan only.",
      },
      {
        id: "bank_transfer",
        title: "Bank transfer",
        detail: "We send IBAN details after you place the order.",
      },
    ];
    if (stripeEnabled) {
      list.push({
        id: "stripe",
        title: "Card (Stripe)",
        detail: "Secure checkout via Stripe. You will be redirected to pay.",
      });
    } else {
      list.push({
        id: "card_demo",
        title: "Card (demo)",
        detail: "Sandbox card payment — no real charge. Set STRIPE_SECRET_KEY to enable live Stripe.",
      });
    }
    return list;
  }, [stripeEnabled]);

  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const match = getVariant(item.variantId, products);
        if (!match) return sum;
        return sum + (match.variant.salePricePkr ?? match.variant.pricePkr) * item.quantity;
      }, 0),
    [items, products],
  );

  const shippingOptions = useMemo(
    () =>
      listShippingOptions(country, subtotal, {
        storeName: site.name,
        supportEmail: site.email,
        supportPhone: site.phone,
        whatsapp: site.whatsapp,
        freeShippingThresholdPkr: site.freeShippingThresholdPkr,
        domesticShippingPkr: site.domesticShippingPkr,
        internationalShippingPkr: site.internationalShippingPkr,
        usdRate: site.usdRate,
        lowStockThreshold: 5,
      }),
    [country, subtotal],
  );

  useEffect(() => {
    if (!shippingOptions.some((option) => option.id === shippingMethodId)) {
      setShippingMethodId(shippingOptions[0]?.id ?? "pk-standard");
    }
  }, [shippingOptions, shippingMethodId]);

  const shipping = shippingOptions.find((option) => option.id === shippingMethodId) ?? shippingOptions[0];
  const shippingAmount = shipping?.amountPkr ?? 0;
  const tax = estimateTaxPkr(subtotal, country);
  const total = subtotal + shippingAmount + tax;

  async function onSubmit(formData: FormData) {
    setErrors({});
    const payload = {
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      country,
      city: String(formData.get("city") ?? ""),
      area: String(formData.get("area") ?? ""),
      address: String(formData.get("address") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      discountCode: String(formData.get("discountCode") ?? ""),
      paymentMethod,
      shippingMethodId,
      currency,
      items,
    };
    const parsed = checkoutSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      toast.error("Please check the highlighted fields.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = (await response.json()) as {
        error?: string;
        orderNumber?: string;
        order?: unknown;
        checkoutUrl?: string;
      };
      if (!response.ok || !data.orderNumber) {
        toast.error(data.error ?? "Could not place the order.");
        return;
      }
      if (data.order) {
        sessionStorage.setItem(`garmentloop-order:${data.orderNumber}`, JSON.stringify(data.order));
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      clear();
      router.push(`/order/${data.orderNumber}`);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border px-6 py-16 text-center">
        <p className="font-serif text-3xl">Nothing to check out</p>
        <p className="mt-2 text-sm text-muted-foreground">Add a jacket or knit before placing an order.</p>
        <Button className="mt-6 h-11 px-6" render={<a href="/shop" />}>
          Continue shopping
        </Button>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
      <CheckoutFormMainColumn
        steps={steps}
        step={step}
        setStep={setStep}
        errors={errors}
        defaults={defaults}
        country={country}
        setCountry={setCountry}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        stripeEnabled={stripeEnabled}
        payments={payments}
        shippingOptions={shippingOptions}
        shippingMethodId={shippingMethodId}
        setShippingMethodId={setShippingMethodId}
        shippingLabel={shipping?.label}
      />
      <CheckoutFormSummary
        items={items}
        products={products}
        subtotal={subtotal}
        shippingAmount={shippingAmount}
        shippingLabel={shipping?.label}
        tax={tax}
        total={total}
        currency={currency}
        country={country}
        pending={pending}
        stripeEnabled={stripeEnabled}
        errors={errors}
        step={step}
        paymentMethod={paymentMethod}
      />
    </form>
  );
}
