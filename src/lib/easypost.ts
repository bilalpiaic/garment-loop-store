import type { StoreSettings } from "@/lib/identity";
import { DEFAULT_SETTINGS } from "@/lib/identity";
import {
  encodeEasyPostMethodId,
  listShippingOptions,
  parseEasyPostMethodId,
  type ShippingRateOption,
} from "@/lib/shipping";

const EASYPOST_API = "https://api.easypost.com/v2";

export function easypostApiKey() {
  return (process.env.EASYPOST_API_KEY ?? "").trim();
}

export function easypostConfigured() {
  return Boolean(easypostApiKey());
}

export type EasyPostFromAddress = {
  name: string;
  street1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
};

/** Ship-from address for rating. Incomplete config → null (caller falls back to zones). */
export function easypostFromAddress(): EasyPostFromAddress | null {
  const name = (process.env.EASYPOST_FROM_NAME ?? "").trim();
  const street1 = (process.env.EASYPOST_FROM_STREET1 ?? "").trim();
  const city = (process.env.EASYPOST_FROM_CITY ?? "").trim();
  const state = (process.env.EASYPOST_FROM_STATE ?? "").trim();
  const zip = (process.env.EASYPOST_FROM_ZIP ?? "").trim();
  const country = (process.env.EASYPOST_FROM_COUNTRY ?? "PK").trim().toUpperCase();
  const phone = (process.env.EASYPOST_FROM_PHONE ?? "").trim() || undefined;
  if (!name || !street1 || !city || !state || !zip || !country) return null;
  return { name, street1, city, state, zip, country, phone };
}

export type QuoteAddress = {
  name: string;
  street1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
};

export type QuoteParcel = {
  /** Weight in ounces (EasyPost default). */
  weightOz: number;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
};

type EasyPostRate = {
  id: string;
  carrier: string;
  service: string;
  rate: string;
  currency: string;
  delivery_days?: number | null;
  delivery_date?: string | null;
  est_delivery_days?: number | null;
};

type EasyPostAddress = {
  street1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
};

type EasyPostParcel = {
  weight?: number | string | null;
};

type EasyPostShipment = {
  id: string;
  rates?: EasyPostRate[];
  messages?: { message?: string }[];
  to_address?: EasyPostAddress | null;
  parcel?: EasyPostParcel | null;
  tracking_code?: string | null;
  tracker?: { public_url?: string | null; tracking_code?: string | null } | null;
  postage_label?: { label_url?: string | null; label_pdf_url?: string | null } | null;
  selected_rate?: EasyPostRate | null;
};

function norm(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function countriesMatch(a: string | null | undefined, b: string | null | undefined) {
  return norm(a).toUpperCase() === norm(b).toUpperCase();
}

function addressesMatch(expected: QuoteAddress, actual?: EasyPostAddress | null) {
  if (!actual) return false;
  return (
    countriesMatch(expected.country, actual.country) &&
    norm(expected.city) === norm(actual.city) &&
    norm(expected.street1) === norm(actual.street1) &&
    norm(expected.zip) === norm(actual.zip)
  );
}

export function expectedParcelWeightOz(itemCount: number) {
  return Math.max(8, Math.round(itemCount) * 12);
}

function parcelWeightMatches(expectedOz: number, actual?: EasyPostParcel | null) {
  if (!actual?.weight && actual?.weight !== 0) return false;
  const weight = Number(actual.weight);
  if (!Number.isFinite(weight)) return false;
  return Math.abs(weight - expectedOz) <= 0.51;
}

async function easypostFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const key = easypostApiKey();
  if (!key) throw new Error("EASYPOST_API_KEY is not set.");
  const auth = Buffer.from(`${key}:`).toString("base64");
  const response = await fetch(`${EASYPOST_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: { message?: string };
    message?: string;
  };
  if (!response.ok) {
    const message =
      data.error?.message ?? data.message ?? `EasyPost HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

function toPkr(amount: number, currency: string, usdRate: number) {
  const code = currency.toUpperCase();
  if (code === "PKR") return Math.round(amount);
  if (code === "USD") return Math.round(amount * usdRate);
  // Conservative fallback: treat unknown currencies as USD-equivalent.
  return Math.round(amount * usdRate);
}

function rateToOption(
  shipmentId: string,
  rate: EasyPostRate,
  settings: StoreSettings,
): ShippingRateOption {
  const amount = Number.parseFloat(rate.rate);
  const days = rate.delivery_days ?? rate.est_delivery_days;
  const eta =
    typeof days === "number" && days > 0
      ? `${days} business day${days === 1 ? "" : "s"}`
      : "Carrier estimate";
  return {
    id: encodeEasyPostMethodId(shipmentId, rate.id),
    zoneId: "intl",
    label: `${rate.carrier} · ${rate.service}`,
    description: "Live carrier rate via EasyPost",
    amountPkr: toPkr(Number.isFinite(amount) ? amount : 0, rate.currency || "USD", settings.usdRate),
    eta,
    source: "easypost",
    carrier: rate.carrier,
    service: rate.service,
    easypostShipmentId: shipmentId,
    easypostRateId: rate.id,
  };
}

export async function createEasyPostShipmentRates(input: {
  to: QuoteAddress;
  parcel: QuoteParcel;
  settings?: StoreSettings;
}): Promise<ShippingRateOption[]> {
  const from = easypostFromAddress();
  if (!easypostConfigured() || !from) {
    throw new Error("EasyPost is not fully configured.");
  }
  const settings = input.settings ?? DEFAULT_SETTINGS;
  const body = {
    shipment: {
      to_address: {
        name: input.to.name,
        street1: input.to.street1,
        city: input.to.city,
        state: input.to.state,
        zip: input.to.zip,
        country: input.to.country,
        phone: input.to.phone,
      },
      from_address: {
        name: from.name,
        street1: from.street1,
        city: from.city,
        state: from.state,
        zip: from.zip,
        country: from.country,
        phone: from.phone,
      },
      parcel: {
        weight: Math.max(1, input.parcel.weightOz),
        length: input.parcel.lengthIn ?? 12,
        width: input.parcel.widthIn ?? 10,
        height: input.parcel.heightIn ?? 4,
      },
    },
  };
  const shipment = await easypostFetch<EasyPostShipment>("/shipments", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const rates = shipment.rates ?? [];
  if (!shipment.id || rates.length === 0) {
    const hint = shipment.messages?.map((m) => m.message).filter(Boolean).join("; ");
    throw new Error(hint || "EasyPost returned no rates for this address.");
  }
  return rates
    .map((rate) => rateToOption(shipment.id, rate, settings))
    .sort((a, b) => a.amountPkr - b.amountPkr);
}

/**
 * Re-load a quoted EasyPost rate at checkout time (do not trust client amounts).
 * Requires the stored shipment destination + parcel to match the order being placed.
 */
export async function retrieveEasyPostRateOption(
  shippingMethodId: string,
  expected: { to: QuoteAddress; itemCount: number },
  settings: StoreSettings = DEFAULT_SETTINGS,
): Promise<ShippingRateOption | null> {
  const parsed = parseEasyPostMethodId(shippingMethodId);
  if (!parsed || !easypostConfigured()) return null;
  try {
    const shipment = await easypostFetch<EasyPostShipment>(`/shipments/${parsed.shipmentId}`);
    const rate = shipment.rates?.find((item) => item.id === parsed.rateId);
    if (!rate || !shipment.id) return null;
    if (!addressesMatch(expected.to, shipment.to_address)) {
      console.error("[easypost] rate destination mismatch", {
        expected: expected.to,
        actual: shipment.to_address,
      });
      return null;
    }
    const weightOz = expectedParcelWeightOz(expected.itemCount);
    if (!parcelWeightMatches(weightOz, shipment.parcel)) {
      console.error("[easypost] rate parcel mismatch", {
        expectedOz: weightOz,
        actual: shipment.parcel?.weight,
      });
      return null;
    }
    return rateToOption(shipment.id, rate, settings);
  } catch (error) {
    console.error("[easypost] retrieve rate failed", error);
    return null;
  }
}

/**
 * Checkout/admin helper: live rates when EasyPost is ready, otherwise zone fallback.
 * Never invents API keys — missing config is an explicit zone path.
 */
export async function quoteShippingOptions(input: {
  country: string;
  subtotalPkr: number;
  to?: Partial<QuoteAddress>;
  itemCount: number;
  settings?: StoreSettings;
}): Promise<{ options: ShippingRateOption[]; source: "easypost" | "zone"; note?: string }> {
  const settings = input.settings ?? DEFAULT_SETTINGS;
  const zone = listShippingOptions(input.country, input.subtotalPkr, settings);

  if (!easypostConfigured()) {
    return {
      options: zone,
      source: "zone",
      note: "Zone rates (set EASYPOST_API_KEY + EASYPOST_FROM_* for live carriers).",
    };
  }
  if (!easypostFromAddress()) {
    return {
      options: zone,
      source: "zone",
      note: "EasyPost key set, but ship-from address is incomplete — using zone rates.",
    };
  }

  const to = input.to;
  if (!to?.street1 || !to.city || !to.country) {
    return {
      options: zone,
      source: "zone",
      note: "Enter a full delivery address to load live carrier rates.",
    };
  }

  const zip = (to.zip ?? "").trim();
  if (!zip) {
    return {
      options: zone,
      source: "zone",
      note: "Add a postal / ZIP code to load live carrier rates.",
    };
  }

  try {
    const options = await createEasyPostShipmentRates({
      to: {
        name: (to.name ?? "Customer").trim() || "Customer",
        street1: to.street1.trim(),
        city: to.city.trim(),
        state: (to.state ?? to.city).trim() || to.city.trim(),
        zip,
        country: to.country.trim().toUpperCase(),
        phone: to.phone,
      },
      parcel: {
        weightOz: expectedParcelWeightOz(input.itemCount),
      },
      settings,
    });
    return {
      options,
      source: "easypost",
      note: "Live carrier rates from EasyPost.",
    };
  } catch (error) {
    console.error("[easypost] quote failed", error);
    return {
      options: zone,
      source: "zone",
      note:
        error instanceof Error
          ? `Live rates unavailable (${error.message}). Showing zone rates.`
          : "Live rates unavailable. Showing zone rates.",
    };
  }
}

export function shippingLabelStubMessage() {
  if (!easypostConfigured()) {
    return "Set EASYPOST_API_KEY (and EASYPOST_FROM_*) to enable carrier label purchase.";
  }
  return "EasyPost is configured. Order must use a live EasyPost shipping method to buy a label.";
}

export type BoughtShippingLabel = {
  labelUrl: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  service?: string;
  shipmentId: string;
  rateId: string;
};

/**
 * Buy an EasyPost rate for a checkout shipping method id (`easypost:shipment:rate`).
 * Returns postage label URL + tracking when the carrier purchase succeeds.
 */
export async function buyEasyPostLabel(shippingMethodId: string): Promise<BoughtShippingLabel> {
  if (!easypostConfigured()) {
    throw new Error(shippingLabelStubMessage());
  }
  const parsed = parseEasyPostMethodId(shippingMethodId);
  if (!parsed) {
    throw new Error("This order used zone rates — live EasyPost shipping is required to buy a label.");
  }

  const bought = await easypostFetch<EasyPostShipment>(`/shipments/${parsed.shipmentId}/buy`, {
    method: "POST",
    body: JSON.stringify({ rate: { id: parsed.rateId } }),
  });

  const labelUrl =
    bought.postage_label?.label_pdf_url ||
    bought.postage_label?.label_url ||
    "";
  if (!labelUrl) {
    throw new Error("EasyPost purchased the rate but returned no label URL.");
  }

  return {
    labelUrl,
    trackingNumber: bought.tracking_code || bought.tracker?.tracking_code || undefined,
    trackingUrl: bought.tracker?.public_url || undefined,
    carrier: bought.selected_rate?.carrier,
    service: bought.selected_rate?.service,
    shipmentId: bought.id || parsed.shipmentId,
    rateId: parsed.rateId,
  };
}
