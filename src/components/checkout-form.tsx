"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { countries, pakistanCities, site } from "@/lib/site";
import { checkoutSchema } from "@/lib/checkout-schema";
import { getVariant } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { listShippingOptions } from "@/lib/shipping";
import { estimateTaxPkr, taxLabel } from "@/lib/tax";
import { useCartStore, usePreferenceStore } from "@/store/store";
import { useCatalog } from "@/components/catalog-provider";
import { Price } from "@/components/price";
import { cn } from "@/lib/utils";
import type { CustomerAddress } from "@/lib/identity";

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
      <div className="space-y-8">
        <ol className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {steps.map((item) => (
            <li
              key={item.id}
              className={cn(
                "rounded-full border px-3 py-1.5",
                step === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border",
              )}
            >
              {item.id}. {item.label}
            </li>
          ))}
        </ol>
        <section className={cn("space-y-4", step !== 1 && "hidden")}>
          <h2 className="font-serif text-2xl">Contact</h2>
          <Field
            label="Full name"
            name="fullName"
            error={errors.fullName}
            autoComplete="name"
            defaultValue={defaults?.fullName ?? defaults?.address?.fullName}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Email"
              name="email"
              type="email"
              error={errors.email}
              autoComplete="email"
              defaultValue={defaults?.email}
            />
            <Field
              label="Phone"
              name="phone"
              type="tel"
              error={errors.phone}
              autoComplete="tel"
              placeholder="03xx or +92"
              defaultValue={defaults?.phone ?? defaults?.address?.phone}
            />
          </div>
        </section>
        <section className={cn("space-y-4", step !== 1 && "hidden")}>
          <h2 className="font-serif text-2xl">Delivery</h2>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <select
              id="country"
              name="country"
              value={country}
              onChange={(event) => {
                const next = event.target.value;
                setCountry(next);
                if (next !== "PK" && paymentMethod === "cod") {
                  setPaymentMethod(stripeEnabled ? "stripe" : "bank_transfer");
                }
              }}
              className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              {countries.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                list="city-list"
                className="h-10"
                defaultValue={defaults?.address?.city}
                aria-invalid={Boolean(errors.city)}
              />
              <datalist id="city-list">
                {pakistanCities.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
              {errors.city ? <p className="text-xs text-destructive">{errors.city}</p> : null}
            </div>
            <Field
              label={country === "PK" ? "Area / locality" : "State / area"}
              name="area"
              error={errors.area}
              defaultValue={defaults?.address?.area}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Street address</Label>
            <Textarea
              id="address"
              name="address"
              rows={3}
              defaultValue={defaults?.address?.address}
              aria-invalid={Boolean(errors.address)}
            />
            {errors.address ? <p className="text-xs text-destructive">{errors.address}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Order notes (optional)</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="Gate code, preferred courier, gift note…" />
          </div>
        </section>
        <div className={cn("flex gap-3", step !== 1 && "hidden")}>
          <Button type="button" className="h-11 px-6" onClick={() => setStep(2)}>
            Continue to shipping
          </Button>
        </div>
        <section className={cn("space-y-4", step !== 2 && step !== 3 && "hidden")}>
          <h2 className="font-serif text-2xl">Shipping</h2>
          {errors.shippingMethodId ? (
            <p className="text-xs text-destructive">{errors.shippingMethodId}</p>
          ) : null}
          <div className="space-y-2">
            {shippingOptions.map((option) => (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-4",
                  shippingMethodId === option.id ? "border-primary" : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="shippingMethodId"
                  className="mt-1"
                  value={option.id}
                  checked={shippingMethodId === option.id}
                  onChange={() => setShippingMethodId(option.id)}
                />
                <span className="flex-1">
                  <span className="flex items-center justify-between gap-3 text-sm font-medium">
                    <span>{option.label}</span>
                    <span>{option.amountPkr === 0 ? "Free" : <Price amountPkr={option.amountPkr} />}</span>
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {option.description} · ETA {option.eta}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Rates are zone-based (Pakistan, GCC, international). Live carrier APIs are next.
          </p>
        </section>
        <section className={cn("space-y-4", step !== 2 && step !== 3 && "hidden")}>
          <h2 className="font-serif text-2xl">Payment</h2>
          {errors.paymentMethod ? (
            <p className="text-xs text-destructive">{errors.paymentMethod}</p>
          ) : null}
          <div className="space-y-2">
            {payments.map((method) => {
              const disabled = method.id === "cod" && country !== "PK";
              return (
                <label
                  key={method.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-4",
                    paymentMethod === method.id ? "border-primary" : "border-border",
                    disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    className="mt-1"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    disabled={disabled}
                    onChange={() => setPaymentMethod(method.id)}
                  />
                  <span>
                    <span className="block text-sm font-medium">{method.title}</span>
                    <span className="text-sm text-muted-foreground">{method.detail}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>
        <div className={cn("flex flex-wrap gap-3", step !== 2 && "hidden")}>
          <Button type="button" variant="outline" className="h-11 px-6" onClick={() => setStep(1)}>
            Back
          </Button>
          <Button type="button" className="h-11 px-6" onClick={() => setStep(3)}>
            Review order
          </Button>
        </div>
        <section className={cn("space-y-3 rounded-xl border p-4 text-sm", step !== 3 && "hidden")}>
          <h2 className="font-serif text-2xl">Review</h2>
          <p className="text-muted-foreground">
            Confirm shipping ({shipping?.label}) and payment (
            {paymentMethod.replace("_", " ")}), then place your order. Guest checkout stays available.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" className="h-11 px-6" onClick={() => setStep(2)}>
              Back
            </Button>
          </div>
        </section>
      </div>
      <aside className="h-fit rounded-xl border bg-card p-5 lg:sticky lg:top-24">
        <h2 className="font-serif text-2xl">Order summary</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {items.map((item) => {
            const match = getVariant(item.variantId, products);
            if (!match) return null;
            const unit = match.variant.salePricePkr ?? match.variant.pricePkr;
            return (
              <li key={item.variantId} className="flex justify-between gap-3">
                <span>
                  {match.product.title}
                  <span className="block text-xs text-muted-foreground">
                    {match.variant.color} · {match.variant.size} · ×{item.quantity}
                  </span>
                </span>
                <span>
                  <Price amountPkr={unit * item.quantity} />
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 space-y-2">
          <Label htmlFor="discountCode">Discount code</Label>
          <Input id="discountCode" name="discountCode" className="h-10" placeholder="Optional" />
          {errors.discountCode ? <p className="text-xs text-destructive">{errors.discountCode}</p> : null}
        </div>
        <div className="mt-4 space-y-1 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <Price amountPkr={subtotal} />
          </div>
          <div className="flex justify-between">
            <span>{shipping?.label ?? "Shipping"}</span>
            <span>{shippingAmount === 0 ? "Free" : <Price amountPkr={shippingAmount} />}</span>
          </div>
          <div className="flex justify-between">
            <span>{taxLabel(country)}</span>
            <span>{tax === 0 ? "—" : <Price amountPkr={tax} />}</span>
          </div>
          <div className="flex justify-between pt-2 text-base font-medium">
            <span>Total</span>
            <span>{formatMoney(total, currency)}</span>
          </div>
        </div>
        <Button type="submit" className="mt-5 h-11 w-full" disabled={pending || step !== 3}>
          {pending
            ? paymentMethod === "stripe"
              ? "Redirecting to Stripe…"
              : "Placing order…"
            : step !== 3
              ? "Complete steps to place order"
              : paymentMethod === "stripe"
                ? "Continue to Stripe"
                : "Place order"}
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          Guest checkout is supported. No card data is stored on this site
          {stripeEnabled ? " — Stripe handles payment fields." : "."}
        </p>
      </aside>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  type = "text",
  autoComplete,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  error?: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="h-10"
        aria-invalid={Boolean(error)}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
