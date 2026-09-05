import { NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/checkout-schema";
import { createOrder } from "@/lib/orders";
import { getCustomerSession } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid checkout details." },
      { status: 400 },
    );
  }

  const session = await getCustomerSession();

  const result = await createOrder({
    items: parsed.data.items,
    customer: {
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      country: parsed.data.country,
      city: parsed.data.city,
      area: parsed.data.area,
      address: parsed.data.address,
      notes: parsed.data.notes,
    },
    paymentMethod: parsed.data.paymentMethod,
    currency: parsed.data.currency,
    discountCode: parsed.data.discountCode,
    customerId: session?.customer.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ orderNumber: result.order.orderNumber, order: result.order });
}
