import type { StoreSettings } from "@/lib/identity";
import { DEFAULT_SETTINGS } from "@/lib/identity";

/** Config-driven shipping zones. Live carriers via EasyPost when `EASYPOST_API_KEY` (+ from-address) is set. */
export type ShippingZoneId = "pk-domestic" | "gcc" | "intl";

export type ShippingRateOption = {
  id: string;
  zoneId: ShippingZoneId;
  label: string;
  description: string;
  amountPkr: number;
  eta: string;
  source?: "zone" | "easypost";
  carrier?: string;
  service?: string;
  easypostShipmentId?: string;
  easypostRateId?: string;
};

const GCC = new Set(["AE", "SA", "QA", "KW", "BH", "OM"]);

const EASYPOST_PREFIX = "easypost:";

export function encodeEasyPostMethodId(shipmentId: string, rateId: string) {
  return `${EASYPOST_PREFIX}${shipmentId}:${rateId}`;
}

export function parseEasyPostMethodId(shippingMethodId: string) {
  if (!shippingMethodId.startsWith(EASYPOST_PREFIX)) return null;
  const rest = shippingMethodId.slice(EASYPOST_PREFIX.length);
  const idx = rest.indexOf(":");
  if (idx <= 0) return null;
  const shipmentId = rest.slice(0, idx);
  const rateId = rest.slice(idx + 1);
  if (!shipmentId || !rateId) return null;
  return { shipmentId, rateId };
}

export function isEasyPostMethodId(shippingMethodId: string) {
  return Boolean(parseEasyPostMethodId(shippingMethodId));
}

export function shippingZoneForCountry(countryCode: string): ShippingZoneId {
  if (countryCode === "PK") return "pk-domestic";
  if (GCC.has(countryCode)) return "gcc";
  return "intl";
}

export function listShippingOptions(
  countryCode: string,
  subtotalPkr: number,
  settings: StoreSettings = DEFAULT_SETTINGS,
): ShippingRateOption[] {
  const zone = shippingZoneForCountry(countryCode);
  if (zone === "pk-domestic") {
    const free = subtotalPkr >= settings.freeShippingThresholdPkr;
    return [
      {
        id: "pk-standard",
        zoneId: zone,
        label: free ? "Standard (free)" : "Standard",
        description: free
          ? `Complimentary over PKR ${settings.freeShippingThresholdPkr.toLocaleString("en-PK")}`
          : "Nationwide courier, 2–4 business days",
        amountPkr: free ? 0 : settings.domesticShippingPkr,
        eta: "2–4 business days",
        source: "zone",
      },
      {
        id: "pk-express",
        zoneId: zone,
        label: "Express",
        description: "Priority dispatch, major cities",
        amountPkr: free ? 450 : settings.domesticShippingPkr + 450,
        eta: "1–2 business days",
        source: "zone",
      },
    ];
  }
  if (zone === "gcc") {
    return [
      {
        id: "gcc-standard",
        zoneId: zone,
        label: "GCC air",
        description: "Tracked air parcel to Gulf countries",
        amountPkr: Math.round(settings.internationalShippingPkr * 0.75),
        eta: "5–8 business days",
        source: "zone",
      },
    ];
  }
  return [
    {
      id: "intl-standard",
      zoneId: zone,
      label: "International air",
      description: "Tracked dispatch; duties may apply on arrival",
      amountPkr: settings.internationalShippingPkr,
      eta: "7–14 business days",
      source: "zone",
    },
  ];
}

export function resolveShippingOption(
  countryCode: string,
  shippingMethodId: string | undefined,
  subtotalPkr: number,
  settings: StoreSettings = DEFAULT_SETTINGS,
): ShippingRateOption {
  const options = listShippingOptions(countryCode, subtotalPkr, settings);
  return options.find((option) => option.id === shippingMethodId) ?? options[0]!;
}

/** Back-compat helper used by cart drawer estimates (standard domestic / intl). */
export function estimateShippingPkr(
  subtotalPkr: number,
  countryCode: string,
  settings: StoreSettings = DEFAULT_SETTINGS,
) {
  return resolveShippingOption(countryCode, undefined, subtotalPkr, settings).amountPkr;
}
