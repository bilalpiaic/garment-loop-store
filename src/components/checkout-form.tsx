"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { listShippingOptions, type ShippingRateOption } from "@/lib/shipping";
import { estimateTaxLocal, type TaxQuote } from "@/lib/tax";
import { useCartStore, usePreferenceStore } from "@/store/store";
import { useCatalog } from "@/components/catalog-provider";
import { Price } from "@/components/price";
import { cn } from "@/lib/utils";
import { cardDemoAllowed } from "@/lib/card-demo";
import type { CustomerAddress } from "@/lib/identity";
import { orderAccessPath, type Order } from "@/lib/order-model";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { trackAddPaymentInfo, trackAddShippingInfo } from "@/lib/analytics/track";
import { variantToItem } from "@/lib/analytics/items";

type PaymentId = "cod" | "bank_transfer" | "card_demo" | "stripe";

type QuoteContext = {
  fullName: string;
  phone: string;
  city: string;
  area: string;
  address: string;
  postalCode: string;
};

function zoneOptionsFor(country: string, subtotalPkr: number): ShippingRateOption[] {
  return listShippingOptions(country, subtotalPkr, {
    storeName: site.name,
    supportEmail: site.email,
    supportPhone: site.phone,
    whatsapp: site.whatsapp,
    freeShippingThresholdPkr: site.freeShippingThresholdPkr,
    domesticShippingPkr: site.domesticShippingPkr,
    internationalShippingPkr: site.internationalShippingPkr,
    usdRate: site.usdRate,
    lowStockThreshold: 5,
  });
}

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
  const [shippingOptions, setShippingOptions] = useState<ShippingRateOption[]>(() =>
    zoneOptionsFor(defaults?.address?.country ?? "PK", 0),
  );
  const [shippingSource, setShippingSource] = useState<"zone" | "easypost">("zone");
  const [shippingNote, setShippingNote] = useState<string | undefined>();
  const [ratesLoading, setRatesLoading] = useState(false);
  const [quote, setQuote] = useState<QuoteContext | null>(null);
  const ratesRequestId = useRef(0);
  const [taxQuote, setTaxQuote] = useState<TaxQuote>(() =>
    estimateTaxLocal(0, defaults?.address?.country ?? "PK"),
  );
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
        title: "Card · wallets · BNPL",
        detail:
          "Stripe Payment Element — cards, Apple Pay / Google Pay / Link when available, plus Klarna / Afterpay where Stripe enables them.",
      });
    } else if (cardDemoAllowed()) {
      list.push({
        id: "card_demo",
        title: "Card (demo)",
        detail:
          "Sandbox card payment — no real charge. Set STRIPE_SECRET_KEY + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY for wallets / BNPL.",
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

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const analyticsItems = useMemo(
    () =>
      items.flatMap((item) => {
        const match = getVariant(item.variantId, products);
        if (!match) return [];
        return [variantToItem(match.product, match.variant, item.quantity)];
      }),
    [items, products],
  );

  const selectedShipping =
    shippingOptions.find((option) => option.id === shippingMethodId) ?? shippingOptions[0];
  const effectiveShippingMethodId = selectedShipping?.id ?? "pk-standard";
  const shippingAmount = selectedShipping?.amountPkr ?? 0;
  const tax = taxQuote.amountPkr;
  const total = subtotal + shippingAmount + tax;

  function pickShippingId(options: ShippingRateOption[], preferred?: string) {
    if (preferred && options.some((option) => option.id === preferred)) return preferred;
    return options[0]?.id ?? "pk-standard";
  }

  async function refreshRates(nextQuote: QuoteContext, nextCountry = country) {
    const requestId = ++ratesRequestId.current;
    const preferredId = shippingMethodId;
    const fallback = zoneOptionsFor(nextCountry, subtotal);
    setRatesLoading(true);
    try {
      const response = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: nextCountry,
          city: nextQuote.city,
          area: nextQuote.area,
          address: nextQuote.address,
          postalCode: nextQuote.postalCode,
          fullName: nextQuote.fullName,
          phone: nextQuote.phone,
          subtotalPkr: subtotal,
          itemCount: Math.max(1, itemCount),
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        options?: ShippingRateOption[];
        source?: "zone" | "easypost";
        note?: string;
      };
      if (requestId !== ratesRequestId.current) return;
      if (!response.ok || !data.options?.length) {
        setShippingNote(data.error ?? data.note ?? "Using zone shipping rates.");
        setShippingOptions(fallback);
        setShippingSource("zone");
        setShippingMethodId(pickShippingId(fallback, preferredId));
        return;
      }
      setShippingOptions(data.options);
      setShippingSource(data.source ?? "zone");
      setShippingNote(data.note);
      setShippingMethodId(pickShippingId(data.options, preferredId));
    } catch {
      if (requestId !== ratesRequestId.current) return;
      setShippingNote("Could not reach shipping service. Using zone rates.");
      setShippingOptions(fallback);
      setShippingSource("zone");
      setShippingMethodId(pickShippingId(fallback, preferredId));
    } finally {
      if (requestId === ratesRequestId.current) setRatesLoading(false);
    }
  }

  function readQuoteFromForm(form: HTMLFormElement): QuoteContext {
    const fd = new FormData(form);
    return {
      fullName: String(fd.get("fullName") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      city: String(fd.get("city") ?? ""),
      area: String(fd.get("area") ?? ""),
      address: String(fd.get("address") ?? ""),
      postalCode: String(fd.get("postalCode") ?? ""),
    };
  }

  useEffect(() => {
    // Refresh on destination/cart changes while on shipping/review — not when only
    // advancing step 2 → 3 (that used to wipe the shopper's selected carrier).
    if (step < 2 || !quote) return;
    void refreshRates(quote, country);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- quote/cart/country drive refresh; step gate only
  }, [country, subtotal, itemCount, quote]);

  useEffect(() => {
    let cancelled = false;
    const local = estimateTaxLocal(subtotal, country);
    setTaxQuote(local);
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch("/api/tax/quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              country,
              taxablePkr: subtotal,
              shippingPkr: shippingAmount,
              city: quote?.city,
              area: quote?.area,
              address: quote?.address,
              postalCode: quote?.postalCode,
            }),
          });
          const data = (await response.json()) as { quote?: TaxQuote };
          if (!cancelled && data.quote) setTaxQuote(data.quote);
        } catch {
          /* keep local estimate */
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [country, subtotal, shippingAmount, quote]);


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
      postalCode: String(formData.get("postalCode") ?? quote?.postalCode ?? ""),
      notes: String(formData.get("notes") ?? ""),
      discountCode: String(formData.get("discountCode") ?? ""),
      paymentMethod,
      shippingMethodId: effectiveShippingMethodId,
      currency,
      items,
    };
    if (ratesLoading) {
      toast.error("Wait for shipping rates to finish loading.");
      return;
    }
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
        order?: Order;
        checkoutUrl?: string;
        clientSecret?: string;
        publishableKey?: string;
        payPath?: string;
      };
      if (!response.ok || !data.orderNumber) {
        toast.error(data.error ?? "Could not place the order.");
        return;
      }
      const accessToken = data.order?.accessToken;
      if (data.order) {
        sessionStorage.setItem(`garmentloop-order:${data.orderNumber}`, JSON.stringify(data.order));
      }
      if (data.clientSecret && data.publishableKey) {
        try {
          sessionStorage.setItem(
            `garmentloop-stripe:${data.orderNumber}`,
            JSON.stringify({
              clientSecret: data.clientSecret,
              publishableKey: data.publishableKey,
            }),
          );
        } catch {
          /* ignore */
        }
        clear();
        router.push(
          data.payPath ?? orderAccessPath(data.orderNumber, accessToken, "/pay"),
        );
        return;
      }
      if (data.checkoutUrl) {
        clear();
        window.location.href = data.checkoutUrl;
        return;
      }
      clear();
      router.push(orderAccessPath(data.orderNumber, accessToken));
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="atelier-panel px-6 py-16 text-center">
        <p className="font-serif text-3xl">Nothing to check out</p>
        <p className="mt-2 text-sm text-muted-foreground">Add a jacket or knit before placing an order.</p>
        <Button className="btn-lux mt-6 h-11 px-6" render={<a href="/shop" />}>
          Continue shopping
        </Button>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-8">
        <ol className="flex flex-wrap gap-3 border-b border-champagne/25 pb-5">
          {steps.map((item) => (
            <li
              key={item.id}
              className={cn(
                "text-xs uppercase tracking-[0.16em]",
                step === item.id ? "text-olive" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "mr-2 inline-flex size-5 items-center justify-center border text-[10px]",
                  step === item.id
                    ? "border-olive bg-olive text-cream"
                    : "border-border text-muted-foreground",
                )}
              >
                {item.id}
              </span>
              {item.label}
            </li>
          ))}
        </ol>
        <section className={cn("space-y-4", step !== 1 && "hidden")}>
          <div>
            <p className="section-kicker">Step 1</p>
            <h2 className="mt-1 font-serif text-2xl tracking-tight">Contact</h2>
          </div>
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
          <div>
            <p className="section-kicker">Address</p>
            <h2 className="mt-1 font-serif text-2xl tracking-tight">Delivery</h2>
          </div>
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
          <datalist id="city-list">
            {pakistanCities.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
          <AddressAutocomplete
            country={country}
            cityListId="city-list"
            defaultStreet={defaults?.address?.address}
            defaultCity={defaults?.address?.city}
            defaultArea={defaults?.address?.area}
            defaultPostalCode={defaults?.address?.postalCode}
            errors={{
              address: errors.address,
              city: errors.city,
              area: errors.area,
              postalCode: errors.postalCode,
            }}
          />
          <div className="space-y-2">
            <Label htmlFor="notes">Order notes (optional)</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="Gate code, preferred courier, gift note…" />
          </div>
        </section>
        <div className={cn("flex gap-3", step !== 1 && "hidden")}>
          <Button
            type="button"
            className="btn-lux h-11 px-6"
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (!form) return;
              setQuote(readQuoteFromForm(form));
              setStep(2);
            }}
          >
            Continue to shipping
          </Button>
        </div>
        <section className={cn("space-y-4", step !== 2 && step !== 3 && "hidden")}>
          <div>
            <p className="section-kicker">Step 2</p>
            <h2 className="mt-1 font-serif text-2xl tracking-tight">Shipping</h2>
          </div>
          {errors.shippingMethodId ? (
            <p className="text-xs text-destructive">{errors.shippingMethodId}</p>
          ) : null}
          {ratesLoading ? (
            <p className="text-sm text-muted-foreground">Fetching shipping options…</p>
          ) : null}
          <div className="space-y-2">
            {shippingOptions.map((option) => (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                  effectiveShippingMethodId === option.id
                    ? "border-olive bg-secondary/50"
                    : "border-border hover:border-olive/40",
                )}
              >
                <input
                  type="radio"
                  name="shippingMethodId"
                  className="mt-1"
                  value={option.id}
                  checked={effectiveShippingMethodId === option.id}
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
            {shippingNote ??
              (shippingSource === "easypost"
                ? "Live carrier rates via EasyPost."
                : "Zone rates (Pakistan, GCC, international). Set EASYPOST_API_KEY for live carriers.")}
          </p>
        </section>
        <section className={cn("space-y-4", step !== 2 && step !== 3 && "hidden")}>
          <div>
            <p className="section-kicker">Pay</p>
            <h2 className="mt-1 font-serif text-2xl tracking-tight">Payment</h2>
          </div>
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
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                    paymentMethod === method.id
                      ? "border-olive bg-secondary/50"
                      : "border-border hover:border-olive/40",
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
          <Button
            type="button"
            className="btn-lux h-11 px-6"
            onClick={() => {
              trackAddShippingInfo(
                analyticsItems,
                total,
                selectedShipping?.label ?? effectiveShippingMethodId,
              );
              trackAddPaymentInfo(analyticsItems, total, paymentMethod);
              setStep(3);
            }}
          >
            Review order
          </Button>
        </div>
        <section className={cn("atelier-panel space-y-3 p-5 text-sm", step !== 3 && "hidden")}>
          <div>
            <p className="section-kicker">Step 3</p>
            <h2 className="mt-1 font-serif text-2xl tracking-tight">Review</h2>
          </div>
          <p className="text-muted-foreground">
            Confirm shipping ({selectedShipping?.label}) and payment (
            {paymentMethod.replace("_", " ")}), then place your order. Guest checkout stays available.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" className="h-11 px-6" onClick={() => setStep(2)}>
              Back
            </Button>
          </div>
        </section>
      </div>
      <aside className="atelier-panel h-fit rounded-lg p-5 lg:sticky lg:top-24">
        <p className="section-kicker text-champagne">Bag</p>
        <h2 className="mt-1 font-serif text-2xl tracking-tight">Order summary</h2>
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
          <Label htmlFor="discountCode">Discount or gift card</Label>
          <Input
            id="discountCode"
            name="discountCode"
            className="h-10"
            placeholder="WINTER10 or GL-GIFT-1000"
          />
          {errors.discountCode ? <p className="text-xs text-destructive">{errors.discountCode}</p> : null}
        </div>
        <div className="mt-4 space-y-1 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <Price amountPkr={subtotal} />
          </div>
          <div className="flex justify-between">
            <span>{selectedShipping?.label ?? "Shipping"}</span>
            <span>{shippingAmount === 0 ? "Free" : <Price amountPkr={shippingAmount} />}</span>
          </div>
          <div className="flex justify-between">
            <span>{taxQuote.label}</span>
            <span>{tax === 0 ? "—" : <Price amountPkr={tax} />}</span>
          </div>
          {taxQuote.lines.length > 0 ? (
            <ul className="space-y-0.5 pl-1 text-xs text-muted-foreground">
              {taxQuote.lines.map((line) => (
                <li key={`${line.description}-${line.amountPkr}`} className="flex justify-between gap-3">
                  <span>
                    {line.description}
                    {line.ratePercent > 0 ? ` (${line.ratePercent}%)` : ""}
                  </span>
                  <span>
                    {line.amountPkr === 0 ? "—" : <Price amountPkr={line.amountPkr} />}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {taxQuote.note ? <p className="text-xs text-muted-foreground">{taxQuote.note}</p> : null}
          <div className="flex justify-between pt-2 text-base font-medium">
            <span>Total</span>
            <span>{formatMoney(total, currency)}</span>
          </div>
        </div>
        <Button
          type="submit"
          className="btn-lux btn-shimmer mt-5 h-11 w-full"
          disabled={pending || ratesLoading || step !== 3}
        >
          {pending
            ? paymentMethod === "stripe"
              ? "Opening secure payment…"
              : "Placing order…"
            : step !== 3
              ? "Complete steps to place order"
              : paymentMethod === "stripe"
                ? "Continue to payment"
                : "Place order"}
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          Guest checkout is supported. No card data is stored on this site
          {stripeEnabled
            ? " — Stripe Payment Element handles cards, wallets, and BNPL."
            : "."}
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
