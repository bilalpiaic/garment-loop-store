"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { countries, pakistanCities, site } from "@/lib/site";
import { checkoutSchema } from "@/lib/checkout-schema";
import { getVariant } from "@/lib/catalog";
import { formatMoney, shippingCostPkr, type Currency } from "@/lib/money";
import { useCartStore, usePreferenceStore } from "@/store/store";
import { useCatalog } from "@/components/catalog-provider";
import { Price } from "@/components/price";
import { cn } from "@/lib/utils";
import type { CustomerAddress } from "@/lib/identity";

const payments = [
  {
    id: "cod" as const,
    title: "Cash on delivery",
    detail: "Pay when your order arrives. Pakistan only.",
  },
  {
    id: "bank_transfer" as const,
    title: "Bank transfer",
    detail: "We send IBAN details after you place the order.",
  },
  {
    id: "card_demo" as const,
    title: "Card (demo)",
    detail: "Sandbox card payment — no real charge.",
  },
];

export function CheckoutForm({
  defaults,
}: {
  defaults?: {
    fullName?: string;
    email?: string;
    phone?: string;
    address?: CustomerAddress;
  };
}) {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clear = useCartStore((state) => state.clear);
  const currency = usePreferenceStore((state) => state.currency);
  const { products } = useCatalog();
  const [pending, setPending] = useState(false);
  const placingRef = useRef(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fullName, setFullName] = useState(defaults?.fullName ?? defaults?.address?.fullName ?? "");
  const [email, setEmail] = useState(defaults?.email ?? "");
  const [phone, setPhone] = useState(defaults?.phone ?? defaults?.address?.phone ?? "");
  const [country, setCountry] = useState(defaults?.address?.country ?? "PK");
  const [city, setCity] = useState(defaults?.address?.city ?? "");
  const [area, setArea] = useState(defaults?.address?.area ?? "");
  const [address, setAddress] = useState(defaults?.address?.address ?? "");
  const [notes, setNotes] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "bank_transfer" | "card_demo">("cod");

  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const match = getVariant(item.variantId, products);
        if (!match) return sum;
        return sum + (match.variant.salePricePkr ?? match.variant.pricePkr) * item.quantity;
      }, 0),
    [items, products],
  );
  const shipping = shippingCostPkr(subtotal, country);
  const total = subtotal + shipping;

  async function placeOrder(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (placingRef.current) return;
    setErrors({});
    const cartItems = useCartStore.getState().items.map((item) => ({
      variantId: item.variantId,
      quantity: Number(item.quantity),
    }));
    const displayCurrency: Currency = usePreferenceStore.getState().currency === "USD" ? "USD" : "PKR";
    const payload = {
      fullName,
      email,
      phone,
      country,
      city,
      area,
      address,
      notes: notes.trim() || undefined,
      discountCode: discountCode.trim() || undefined,
      paymentMethod: country !== "PK" && paymentMethod === "cod" ? "bank_transfer" : paymentMethod,
      currency: displayCurrency,
      items: cartItems,
    };
    const parsed = checkoutSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      const first = parsed.error.issues[0]?.message ?? "Please check the highlighted fields.";
      toast.error(first);
      return;
    }
    placingRef.current = true;
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
      };
      if (!response.ok || !data.orderNumber) {
        toast.error(data.error ?? "Could not place the order.");
        return;
      }
      clear();
      if (data.order) {
        sessionStorage.setItem(`garmentloop-order:${data.orderNumber}`, JSON.stringify(data.order));
      }
      router.push(`/order/${data.orderNumber}`);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      placingRef.current = false;
      setPending(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border px-6 py-16 text-center">
        <p className="font-serif text-3xl">Nothing to check out</p>
        <p className="mt-2 text-sm text-muted-foreground">Add a jacket or knit before placing an order.</p>
        <Button className="mt-6 h-11 px-6" nativeButton={false} render={<a href="/shop" />}>
          Continue shopping
        </Button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={placeOrder} className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="font-serif text-2xl">Contact</h2>
          <Field
            label="Full name"
            name="fullName"
            error={errors.fullName}
            autoComplete="name"
            value={fullName}
            onChange={setFullName}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Email"
              name="email"
              type="email"
              error={errors.email}
              autoComplete="email"
              value={email}
              onChange={setEmail}
            />
            <Field
              label="Phone"
              name="phone"
              type="tel"
              error={errors.phone}
              autoComplete="tel"
              placeholder="03xx or +92"
              value={phone}
              onChange={setPhone}
            />
          </div>
        </section>
        <section className="space-y-4">
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
                  setPaymentMethod("bank_transfer");
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
                value={city}
                onChange={(event) => setCity(event.target.value)}
                aria-invalid={Boolean(errors.city)}
              />
              <datalist id="city-list">
                {pakistanCities.map((cityName) => (
                  <option key={cityName} value={cityName} />
                ))}
              </datalist>
              {errors.city ? <p className="text-xs text-destructive">{errors.city}</p> : null}
            </div>
            <Field
              label={country === "PK" ? "Area / locality" : "State / area"}
              name="area"
              error={errors.area}
              value={area}
              onChange={setArea}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Street address</Label>
            <Textarea
              id="address"
              name="address"
              rows={3}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              aria-invalid={Boolean(errors.address)}
            />
            {errors.address ? <p className="text-xs text-destructive">{errors.address}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Order notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Gate code, preferred courier, gift note…"
            />
          </div>
          {country === "PK" ? (
            <p className="text-sm text-muted-foreground">
              We will confirm this order on WhatsApp at {site.phone}. Postal codes are optional.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              International delivery is calculated as a flat dispatch fee. Duties may apply on arrival.
            </p>
          )}
        </section>
        <section className="space-y-4">
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
                    paymentMethod === method.id ? "border-foreground" : "border-border",
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
          <Input
            id="discountCode"
            name="discountCode"
            className="h-10"
            placeholder="Optional"
            value={discountCode}
            onChange={(event) => setDiscountCode(event.target.value)}
          />
          {errors.discountCode ? <p className="text-xs text-destructive">{errors.discountCode}</p> : null}
        </div>
        <div className="mt-4 space-y-1 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <Price amountPkr={subtotal} />
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{shipping === 0 ? "Free" : <Price amountPkr={shipping} />}</span>
          </div>
          <div className="flex justify-between pt-2 text-base font-medium">
            <span>Total</span>
            <span>{formatMoney(total, currency)}</span>
          </div>
        </div>
        {errors.items ? <p className="mt-3 text-xs text-destructive">{errors.items}</p> : null}
        <Button
          type="submit"
          className="mt-5 h-11 w-full"
          disabled={pending}
          onClick={(event) => {
            event.preventDefault();
            void placeOrder();
          }}
        >
          {pending ? "Placing order…" : "Place order"}
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          By placing this order you agree to our shipping and return policy. No card data is stored on
          this site.
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
  value,
  onChange,
}: {
  label: string;
  name: string;
  error?: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
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
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10"
        aria-invalid={Boolean(error)}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
