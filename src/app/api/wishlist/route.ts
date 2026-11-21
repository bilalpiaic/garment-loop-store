import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerSession, getWishlist, setWishlist } from "@/lib/platform";

export const dynamic = "force-dynamic";

const schema = z.object({
  productIds: z.array(z.string().min(1)),
});

export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ productIds: [], authenticated: false });
  }
  const entries = await getWishlist(session.customer.id);
  return NextResponse.json({
    productIds: entries.map((entry) => entry.productId),
    authenticated: true,
  });
}

export async function POST(request: Request) {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ ok: true, authenticated: false });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid wishlist payload." }, { status: 400 });
  }
  const now = new Date().toISOString();
  const entries = parsed.data.productIds.map((productId) => ({ productId, addedAt: now }));
  await setWishlist(session.customer.id, entries);
  return NextResponse.json({ ok: true, authenticated: true, productIds: parsed.data.productIds });
}
