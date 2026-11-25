import { shippingZoneForCountry, type ShippingZoneId } from "@/lib/shipping";
import { site } from "@/lib/site";
import { fetchAvalaraTax, avalaraConfigured } from "@/lib/tax-avalara";
import { fetchTaxJarTax, taxjarConfigured } from "@/lib/tax-taxjar";

export type TaxRegion = "pk" | "gcc" | "intl";

export type TaxLine = {
  description: string;
  ratePercent: number;
  amountPkr: number;
};

export type TaxQuote = {
  amountPkr: number;
  label: string;
  region: TaxRegion;
  source: "local" | "avalara" | "taxjar";
  ratePercent: number;
  note?: string;
  lines: TaxLine[];
};

export type TaxAddress = {
  country: string;
  city?: string;
  area?: string;
  address?: string;
  postalCode?: string;
};

const GCC_VAT_RATE = 0.05;
const PK_SALES_TAX_RATE = 0.05;

/** Illustrative destination VAT when Avalara/TaxJar are unset (not collected at checkout). */
const ILLUSTRATIVE_VAT: Record<string, { label: string; ratePercent: number }> = {
  GB: { label: "UK VAT", ratePercent: 20 },
  UK: { label: "UK VAT", ratePercent: 20 },
  US: { label: "US sales tax", ratePercent: 0 },
  CA: { label: "Canada GST/HST", ratePercent: 5 },
  AU: { label: "Australia GST", ratePercent: 10 },
  DE: { label: "EU VAT", ratePercent: 19 },
  FR: { label: "EU VAT", ratePercent: 20 },
  IT: { label: "EU VAT", ratePercent: 22 },
  ES: { label: "EU VAT", ratePercent: 21 },
  NL: { label: "EU VAT", ratePercent: 21 },
};

function zoneToRegion(zone: ShippingZoneId): TaxRegion {
  if (zone === "pk-domestic") return "pk";
  if (zone === "gcc") return "gcc";
  return "intl";
}

/** Sync local estimate — used for instant checkout UI and as API fallback. */
export function estimateTaxLocal(taxablePkr: number, countryCode: string): TaxQuote {
  const taxable = Math.max(0, taxablePkr);
  const region = zoneToRegion(shippingZoneForCountry(countryCode));

  if (region === "pk") {
    const amountPkr = Math.round(taxable * PK_SALES_TAX_RATE);
    return {
      amountPkr,
      label: "Pakistan sales tax (est. 5%)",
      region,
      source: "local",
      ratePercent: PK_SALES_TAX_RATE * 100,
      note: "Illustrative GST/sales-tax estimate on merchandise for Pakistan destinations.",
      lines: [
        {
          description: "PK sales tax",
          ratePercent: PK_SALES_TAX_RATE * 100,
          amountPkr,
        },
      ],
    };
  }

  if (region === "gcc") {
    const amountPkr = Math.round(taxable * GCC_VAT_RATE);
    return {
      amountPkr,
      label: "GCC VAT (est. 5%)",
      region,
      source: "local",
      ratePercent: GCC_VAT_RATE * 100,
      note: "Estimated 5% VAT for Gulf Cooperation Council destinations (AE, SA, QA, KW, BH, OM).",
      lines: [
        {
          description: "GCC VAT",
          ratePercent: GCC_VAT_RATE * 100,
          amountPkr,
        },
      ],
    };
  }

  // Illustrative destination VAT for common markets when Avalara/TaxJar are unset.
  // Still not collected at checkout — shown as 0 charge with a clear note for shoppers.
  const illustrative = ILLUSTRATIVE_VAT[countryCode.toUpperCase()];
  if (illustrative) {
    return {
      amountPkr: 0,
      label: `${illustrative.label} (at destination)`,
      region: "intl",
      source: "local",
      ratePercent: illustrative.ratePercent,
      note: `Estimated ${illustrative.ratePercent}% ${illustrative.label} may apply on arrival. We do not collect it at checkout unless Avalara/TaxJar is configured.`,
      lines: [
        {
          description: `${illustrative.label} (not charged here)`,
          ratePercent: illustrative.ratePercent,
          amountPkr: 0,
        },
      ],
    };
  }

  return {
    amountPkr: 0,
    label: "Import tax / VAT (at destination)",
    region: "intl",
    source: "local",
    ratePercent: 0,
    note: "We do not collect destination tax at checkout for international orders. Duties or VAT may be charged on arrival.",
    lines: [
      {
        description: "Collected at destination (not charged here)",
        ratePercent: 0,
        amountPkr: 0,
      },
    ],
  };
}

/** @deprecated Prefer estimateTaxLocal / quoteTax — kept for call-site compatibility. */
export function estimateTaxPkr(subtotalPkr: number, countryCode: string) {
  return estimateTaxLocal(subtotalPkr, countryCode).amountPkr;
}

export function taxLabel(countryCode: string, quote?: Pick<TaxQuote, "label">) {
  if (quote?.label) return quote.label;
  return estimateTaxLocal(0, countryCode).label;
}

export function taxProviderConfigured() {
  return avalaraConfigured() || taxjarConfigured();
}

export function taxProviderName(): "avalara" | "taxjar" | "local" {
  if (avalaraConfigured()) return "avalara";
  if (taxjarConfigured()) return "taxjar";
  return "local";
}

/**
 * Resolve tax for checkout / order create.
 * Prefers Avalara, then TaxJar, then improved local PK/GCC/intl rules.
 * Never invents API keys — missing env uses local estimates only.
 */
export async function quoteTax(input: {
  taxablePkr: number;
  shippingPkr?: number;
  address: TaxAddress;
  customerCode?: string;
}): Promise<TaxQuote> {
  const local = estimateTaxLocal(input.taxablePkr, input.address.country);

  if (avalaraConfigured()) {
    try {
      const remote = await fetchAvalaraTax({
        taxablePkr: input.taxablePkr,
        shippingPkr: input.shippingPkr ?? 0,
        address: input.address,
        customerCode: input.customerCode,
        usdRate: site.usdRate,
      });
      if (remote) return remote;
    } catch (error) {
      console.error("[tax:avalara]", error);
      return {
        ...local,
        note: `${local.note ?? ""} Avalara unavailable — using local ${local.region.toUpperCase()} estimate.`.trim(),
      };
    }
  }

  if (taxjarConfigured()) {
    try {
      const remote = await fetchTaxJarTax({
        taxablePkr: input.taxablePkr,
        shippingPkr: input.shippingPkr ?? 0,
        address: input.address,
        usdRate: site.usdRate,
      });
      if (remote) return remote;
    } catch (error) {
      console.error("[tax:taxjar]", error);
      return {
        ...local,
        note: `${local.note ?? ""} TaxJar unavailable — using local ${local.region.toUpperCase()} estimate.`.trim(),
      };
    }
  }

  return local;
}
