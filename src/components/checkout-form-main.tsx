"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { countries, pakistanCities } from "@/lib/site";
import { Field } from "@/components/checkout-form-field";
import { CheckoutFormSteps } from "@/components/checkout-form-steps";
import { cn } from "@/lib/utils";
import type { CustomerAddress } from "@/lib/identity";

type PaymentId = "cod" | "bank_transfer" | "card_demo" | "stripe";

export function CheckoutFormMainColumn({
  steps,
  step,
  setStep,
  errors,
  defaults,
  country,
  setCountry,
  paymentMethod,
  setPaymentMethod,
  stripeEnabled,
  payments,
  shippingOptions,
  shippingMethodId,
  setShippingMethodId,
  shippingLabel,
}: {
  steps: { id: 1 | 2 | 3; label: string }[];
  step: 1 | 2 | 3;
  setStep: (step: 1 | 2 | 3) => void;
  errors: Record<string, string>;
  defaults?: {
    fullName?: string;
    email?: string;
    phone?: string;
    address?: CustomerAddress;
  };
  country: string;
  setCountry: (value: string) => void;
  paymentMethod: PaymentId;
  setPaymentMethod: (value: PaymentId) => void;
  stripeEnabled: boolean;
  payments: { id: PaymentId; title: string; detail: string }[];
  shippingOptions: { id: string; label: string; description: string; amountPkr: number; eta: string }[];
  shippingMethodId: string;
  setShippingMethodId: (value: string) => void;
  shippingLabel?: string;
}) {
  return (
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
        <CheckoutFormSteps
          step={step}
          setStep={setStep}
          errors={errors}
          country={country}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          payments={payments}
          shippingOptions={shippingOptions}
          shippingMethodId={shippingMethodId}
          setShippingMethodId={setShippingMethodId}
          shippingLabel={shippingLabel}
        />
      </div>
  );
}
