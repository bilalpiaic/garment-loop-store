import { site } from "@/lib/site";
import { estimateShippingPkr } from "@/lib/shipping";
import { DEFAULT_SETTINGS } from "@/lib/identity";

export type Currency = "PKR" | "USD";

export function convertFromPkr(amountPkr: number, currency: Currency) {
  if (currency === "USD") {
    return amountPkr / site.usdRate;
  }
  return amountPkr;
}

export function formatMoney(amountPkr: number, currency: Currency) {
  const amount = convertFromPkr(amountPkr, currency);
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }
  return `PKR ${new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

/** @deprecated Prefer listShippingOptions / resolveShippingOption from shipping.ts */
export function shippingCostPkr(subtotalPkr: number, countryCode: string) {
  return estimateShippingPkr(subtotalPkr, countryCode, {
    ...DEFAULT_SETTINGS,
    freeShippingThresholdPkr: site.freeShippingThresholdPkr,
    domesticShippingPkr: site.domesticShippingPkr,
    internationalShippingPkr: site.internationalShippingPkr,
    usdRate: site.usdRate,
  });
}
