import { NextResponse } from "next/server";
import { z } from "zod";
import type { AddressSuggestion } from "@/lib/address-suggest";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  q: z.string().trim().min(3).max(120),
  country: z.string().trim().length(2).optional(),
});

type PhotonFeature = {
  properties?: {
    osm_id?: number | string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    town?: string;
    village?: string;
    locality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    countrycode?: string;
  };
};

/**
 * Address suggestions via Komoot Photon (OpenStreetMap) — no API key required.
 * Best-effort; checkout still works if the upstream is slow or unavailable.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    country: url.searchParams.get("country") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ suggestions: [] as AddressSuggestion[] });
  }

  const { q, country } = parsed.data;
  const photon = new URL("https://photon.komoot.io/api/");
  photon.searchParams.set("q", q);
  photon.searchParams.set("limit", "6");
  photon.searchParams.set("lang", "en");
  if (country) photon.searchParams.set("osm_tag", `countrycode:${country.toLowerCase()}`);

  try {
    const response = await fetch(photon.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 0 },
    });
    if (!response.ok) {
      return NextResponse.json({ suggestions: [] as AddressSuggestion[] });
    }
    const data = (await response.json()) as { features?: PhotonFeature[] };
    const suggestions: AddressSuggestion[] = (data.features ?? [])
      .map((feature) => {
        const p = feature.properties ?? {};
        const city = p.city || p.town || p.village || p.locality || "";
        const street = [p.housenumber, p.street || p.name].filter(Boolean).join(" ").trim();
        const area = p.state || p.county || "";
        const postalCode = p.postcode || "";
        const countryCode = (p.countrycode || country || "").toUpperCase();
        const label = [street, city, area, postalCode, countryCode].filter(Boolean).join(", ");
        if (!label) return null;
        return {
          id: String(p.osm_id ?? label),
          label,
          street: street || p.name || "",
          city,
          area,
          postalCode,
          country: countryCode,
        } satisfies AddressSuggestion;
      })
      .filter((item): item is AddressSuggestion => Boolean(item));

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] as AddressSuggestion[] });
  }
}
