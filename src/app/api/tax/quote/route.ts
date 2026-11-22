import { NextResponse } from "next/server";
import { z } from "zod";
import { quoteTax, taxProviderName } from "@/lib/tax";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  country: z.string().min(2),
  city: z.string().trim().optional(),
  area: z.string().trim().optional(),
  address: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  taxablePkr: z.number().nonnegative(),
  shippingPkr: z.number().nonnegative().optional(),
  customerCode: z.string().trim().optional(),
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
      { error: parsed.error.issues[0]?.message ?? "Invalid tax quote request." },
      { status: 400 },
    );
  }

  const quote = await quoteTax({
    taxablePkr: parsed.data.taxablePkr,
    shippingPkr: parsed.data.shippingPkr,
    customerCode: parsed.data.customerCode,
    address: {
      country: parsed.data.country,
      city: parsed.data.city,
      area: parsed.data.area,
      address: parsed.data.address,
      postalCode: parsed.data.postalCode,
    },
  });

  return NextResponse.json({
    quote,
    provider: taxProviderName(),
  });
}
