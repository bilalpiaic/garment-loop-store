import type { TaxAddress, TaxQuote } from "@/lib/tax";

export function taxjarApiKey() {
  return (process.env.TAXJAR_API_KEY ?? "").trim();
}

export function taxjarConfigured() {
  return Boolean(taxjarApiKey());
}

function taxjarBaseUrl() {
  const env = (process.env.TAXJAR_ENV ?? "").trim().toLowerCase();
  if (env === "sandbox") return "https://api.sandbox.taxjar.com";
  return "https://api.taxjar.com";
}

/**
 * TaxJar tax-for-order estimate. Best for US/CA destinations; other countries may return 0 or error
 * (caller falls back to local rules).
 */
export async function fetchTaxJarTax(input: {
  taxablePkr: number;
  shippingPkr: number;
  address: TaxAddress;
  usdRate: number;
}): Promise<TaxQuote | null> {
  if (!taxjarConfigured()) return null;

  const amount = Number((input.taxablePkr / input.usdRate).toFixed(2));
  const shipping = Number((input.shippingPkr / input.usdRate).toFixed(2));

  const fromCountry = (process.env.TAXJAR_FROM_COUNTRY ?? "US").trim().toUpperCase() || "US";
  const fromZip = (process.env.TAXJAR_FROM_ZIP ?? "").trim();
  const fromState = (process.env.TAXJAR_FROM_STATE ?? "").trim();
  const fromCity = (process.env.TAXJAR_FROM_CITY ?? "").trim();

  const body: Record<string, unknown> = {
    from_country: fromCountry,
    to_country: input.address.country,
    to_city: input.address.city,
    to_state: input.address.area,
    to_zip: input.address.postalCode,
    to_street: input.address.address,
    amount,
    shipping,
  };
  if (fromZip) body.from_zip = fromZip;
  if (fromState) body.from_state = fromState;
  if (fromCity) body.from_city = fromCity;

  const response = await fetch(`${taxjarBaseUrl()}/v2/taxes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${taxjarApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as {
    tax?: {
      amount_to_collect?: number;
      rate?: number;
      breakdown?: {
        sales_tax?: number;
        state_tax_rate?: number;
        county_tax_rate?: number;
        city_tax_rate?: number;
        special_tax_rate?: number;
        state_tax_collectable?: number;
        county_tax_collectable?: number;
        city_tax_collectable?: number;
        special_district_tax_collectable?: number;
      };
    };
    error?: string;
    detail?: string;
  };

  if (!response.ok) {
    throw new Error(data.detail || data.error || `TaxJar HTTP ${response.status}`);
  }

  const taxUsd = Number(data.tax?.amount_to_collect ?? 0);
  const amountPkr = Math.max(0, Math.round(taxUsd * input.usdRate));
  const ratePercent = Number(((data.tax?.rate ?? 0) * 100).toFixed(2));
  const breakdown = data.tax?.breakdown;
  const lines = [
    breakdown?.state_tax_collectable
      ? {
          description: "State tax",
          ratePercent: Number(((breakdown.state_tax_rate ?? 0) * 100).toFixed(2)),
          amountPkr: Math.round(Number(breakdown.state_tax_collectable) * input.usdRate),
        }
      : null,
    breakdown?.county_tax_collectable
      ? {
          description: "County tax",
          ratePercent: Number(((breakdown.county_tax_rate ?? 0) * 100).toFixed(2)),
          amountPkr: Math.round(Number(breakdown.county_tax_collectable) * input.usdRate),
        }
      : null,
    breakdown?.city_tax_collectable
      ? {
          description: "City tax",
          ratePercent: Number(((breakdown.city_tax_rate ?? 0) * 100).toFixed(2)),
          amountPkr: Math.round(Number(breakdown.city_tax_collectable) * input.usdRate),
        }
      : null,
    breakdown?.special_district_tax_collectable
      ? {
          description: "Special district tax",
          ratePercent: Number(((breakdown.special_tax_rate ?? 0) * 100).toFixed(2)),
          amountPkr: Math.round(Number(breakdown.special_district_tax_collectable) * input.usdRate),
        }
      : null,
  ].filter(Boolean) as TaxQuote["lines"];

  return {
    amountPkr,
    label: "Sales tax (TaxJar)",
    region:
      input.address.country === "PK"
        ? "pk"
        : ["AE", "SA", "QA", "KW", "BH", "OM"].includes(input.address.country)
          ? "gcc"
          : "intl",
    source: "taxjar",
    ratePercent,
    note: "Quoted via TaxJar. Primarily accurate for US/CA ship-to addresses.",
    lines:
      lines.length > 0
        ? lines
        : [
            {
              description: "TaxJar amount to collect",
              ratePercent,
              amountPkr,
            },
          ],
  };
}
