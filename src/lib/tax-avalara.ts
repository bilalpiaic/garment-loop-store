import type { TaxAddress, TaxQuote } from "@/lib/tax";

export function avalaraAccountId() {
  return (process.env.AVALARA_ACCOUNT_ID ?? "").trim();
}

export function avalaraLicenseKey() {
  return (process.env.AVALARA_LICENSE_KEY ?? "").trim();
}

export function avalaraCompanyCode() {
  return (process.env.AVALARA_COMPANY_CODE ?? "DEFAULT").trim() || "DEFAULT";
}

export function avalaraEnv() {
  const raw = (process.env.AVALARA_ENV ?? "sandbox").trim().toLowerCase();
  return raw === "production" || raw === "prod" ? "production" : "sandbox";
}

export function avalaraConfigured() {
  return Boolean(avalaraAccountId() && avalaraLicenseKey());
}

function avalaraBaseUrl() {
  return avalaraEnv() === "production"
    ? "https://rest.avatax.com"
    : "https://sandbox-rest.avatax.com";
}

/**
 * AvaTax create transaction (SalesOrder) for a tax estimate.
 * Amounts are sent in USD (converted) for broad account compatibility; tax is converted back to PKR.
 */
export async function fetchAvalaraTax(input: {
  taxablePkr: number;
  shippingPkr: number;
  address: TaxAddress;
  customerCode?: string;
  usdRate: number;
}): Promise<TaxQuote | null> {
  if (!avalaraConfigured()) return null;

  const amountUsd = Number((input.taxablePkr / input.usdRate).toFixed(2));
  const shippingUsd = Number((input.shippingPkr / input.usdRate).toFixed(2));
  const auth = Buffer.from(`${avalaraAccountId()}:${avalaraLicenseKey()}`).toString("base64");

  const body = {
    type: "SalesOrder",
    companyCode: avalaraCompanyCode(),
    date: new Date().toISOString().slice(0, 10),
    customerCode: input.customerCode || "GUEST",
    currencyCode: "USD",
    addresses: {
      singleLocation: {
        line1: input.address.address || "Address",
        city: input.address.city || "City",
        region: input.address.area || undefined,
        country: input.address.country,
        postalCode: input.address.postalCode || undefined,
      },
    },
    lines: [
      {
        number: "1",
        quantity: 1,
        amount: amountUsd,
        taxCode: "P0000000",
        description: "GarmentLoop merchandise",
      },
      ...(shippingUsd > 0
        ? [
            {
              number: "2",
              quantity: 1,
              amount: shippingUsd,
              taxCode: "FR",
              description: "Shipping",
            },
          ]
        : []),
    ],
  };

  const response = await fetch(`${avalaraBaseUrl()}/api/v2/transactions/create`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      "X-Avalara-Client": "GarmentLoop;1.0;checkout;tax-estimate",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as {
    totalTax?: number;
    lines?: { tax?: number; description?: string; taxCalculated?: number }[];
    error?: { message?: string };
    message?: string;
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? data.message ?? `Avalara HTTP ${response.status}`);
  }

  const totalTaxUsd = Number(data.totalTax ?? 0);
  const amountPkr = Math.max(0, Math.round(totalTaxUsd * input.usdRate));
  const lines =
    data.lines
      ?.map((line) => {
        const taxUsd = Number(line.tax ?? line.taxCalculated ?? 0);
        return {
          description: line.description || "Tax",
          ratePercent: 0,
          amountPkr: Math.max(0, Math.round(taxUsd * input.usdRate)),
        };
      })
      .filter((line) => line.amountPkr > 0) ?? [];

  return {
    amountPkr,
    label: "Sales tax (Avalara)",
    region:
      input.address.country === "PK"
        ? "pk"
        : ["AE", "SA", "QA", "KW", "BH", "OM"].includes(input.address.country)
          ? "gcc"
          : "intl",
    source: "avalara",
    ratePercent: amountUsd > 0 ? Number(((totalTaxUsd / amountUsd) * 100).toFixed(2)) : 0,
    note: "Quoted via Avalara AvaTax. Set AVALARA_ENV=production for live rates.",
    lines:
      lines.length > 0
        ? lines
        : [
            {
              description: "Avalara total tax",
              ratePercent: 0,
              amountPkr,
            },
          ],
  };
}

/**
 * Commit a SalesInvoice (commit:true) so AvaTax records the transaction for filing.
 * Env-gated — no-ops when Avalara credentials are unset. Never invents keys.
 */
export async function commitAvalaraSalesInvoice(input: {
  orderNumber: string;
  taxablePkr: number;
  shippingPkr: number;
  taxPkr: number;
  address: TaxAddress;
  customerCode?: string;
  usdRate: number;
}): Promise<{ transactionId: string } | null> {
  if (!avalaraConfigured()) return null;

  const amountUsd = Number((input.taxablePkr / input.usdRate).toFixed(2));
  const shippingUsd = Number((input.shippingPkr / input.usdRate).toFixed(2));
  const auth = Buffer.from(`${avalaraAccountId()}:${avalaraLicenseKey()}`).toString("base64");

  const body = {
    type: "SalesInvoice",
    companyCode: avalaraCompanyCode(),
    date: new Date().toISOString().slice(0, 10),
    customerCode: input.customerCode || "GUEST",
    currencyCode: "USD",
    code: input.orderNumber,
    commit: true,
    addresses: {
      singleLocation: {
        line1: input.address.address || "Address",
        city: input.address.city || "City",
        region: input.address.area || undefined,
        country: input.address.country,
        postalCode: input.address.postalCode || undefined,
      },
    },
    lines: [
      {
        number: "1",
        quantity: 1,
        amount: amountUsd,
        taxCode: "P0000000",
        description: `GarmentLoop ${input.orderNumber}`,
      },
      ...(shippingUsd > 0
        ? [
            {
              number: "2",
              quantity: 1,
              amount: shippingUsd,
              taxCode: "FR",
              description: "Shipping",
            },
          ]
        : []),
    ],
  };

  const response = await fetch(`${avalaraBaseUrl()}/api/v2/transactions/create`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      "X-Avalara-Client": "GarmentLoop;1.0;checkout;tax-commit",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as {
    id?: number | string;
    code?: string;
    error?: { message?: string };
    message?: string;
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? data.message ?? `Avalara commit HTTP ${response.status}`);
  }

  const transactionId = String(data.code ?? data.id ?? input.orderNumber);
  return { transactionId };
}
