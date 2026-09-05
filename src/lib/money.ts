import { site } from "@/lib/site";

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

export function shippingCostPkr(subtotalPkr: number, countryCode: string) {
  if (countryCode !== "PK") {
    return site.internationalShippingPkr;
  }
  if (subtotalPkr >= site.freeShippingThresholdPkr) {
    return 0;
  }
  return site.domesticShippingPkr;
}
