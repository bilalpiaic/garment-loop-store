import { NextResponse } from "next/server";
import { z } from "zod";
import { quoteShippingOptions } from "@/lib/easypost";
import { getSettings } from "@/lib/platform";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  country: z.string().min(2),
  city: z.string().trim().optional(),
  area: z.string().trim().optional(),
  address: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  fullName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  subtotalPkr: z.number().nonnegative(),
  itemCount: z.number().int().positive().max(100),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid shipping quote request." },
      { status: 400 },
    );
  }

  const settings = await getSettings();
  const quoted = await quoteShippingOptions({
    country: parsed.data.country,
    subtotalPkr: parsed.data.subtotalPkr,
    itemCount: parsed.data.itemCount,
    settings,
    to: {
      name: parsed.data.fullName,
      street1: parsed.data.address,
      city: parsed.data.city,
      state: parsed.data.area,
      zip: parsed.data.postalCode,
      country: parsed.data.country,
      phone: parsed.data.phone,
    },
  });

  return NextResponse.json({
    options: quoted.options,
    source: quoted.source,
    note: quoted.note,
  });
}
