import { shippingZoneForCountry } from "@/lib/shipping";

/**
 * Simple destination tax estimate for checkout UX.
 * Not a tax engine — Avalara / VAT rules are Phase 2.
 */
export function estimateTaxPkr(subtotalPkr: number, countryCode: string) {
  const taxable = Math.max(0, subtotalPkr);
  const zone = shippingZoneForCountry(countryCode);
  // Pakistan: illustrative 5% sales tax on goods (display estimate).
  if (zone === "pk-domestic") {
    return Math.round(taxable * 0.05);
  }
  // Destination tax not collected for GCC/intl MVP — show 0 with note in UI.
  return 0;
}

export function taxLabel(countryCode: string) {
  if (countryCode === "PK") return "Est. sales tax (5%)";
  return "Tax (collected at destination if applicable)";
}
