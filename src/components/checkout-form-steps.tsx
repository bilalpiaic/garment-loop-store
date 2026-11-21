"use client";

import { Button } from "@/components/ui/button";
import { Price } from "@/components/price";
import { cn } from "@/lib/utils";

type PaymentId = "cod" | "bank_transfer" | "card_demo" | "stripe";

export function CheckoutFormSteps({
  step,
  setStep,
  errors,
  country,
  paymentMethod,
  setPaymentMethod,
  payments,
  shippingOptions,
  shippingMethodId,
  setShippingMethodId,
  shippingLabel,
}: {
  step: 1 | 2 | 3;
  setStep: (step: 1 | 2 | 3) => void;
  errors: Record<string, string>;
  country: string;
  paymentMethod: PaymentId;
  setPaymentMethod: (value: PaymentId) => void;
  payments: { id: PaymentId; title: string; detail: string }[];
  shippingOptions: { id: string; label: string; description: string; amountPkr: number; eta: string }[];
  shippingMethodId: string;
  setShippingMethodId: (value: string) => void;
  shippingLabel?: string;
}) {
  return (
    <>
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
            Confirm shipping ({shippingLabel}) and payment (
            {paymentMethod.replace("_", " ")}), then place your order. Guest checkout stays available.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" className="h-11 px-6" onClick={() => setStep(2)}>
              Back
            </Button>
          </div>
        </section>

    </>
  );
}
