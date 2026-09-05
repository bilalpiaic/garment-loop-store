import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { addressSchema } from "@/lib/admin-schemas";
import { getCustomerSession, listOrders, saveAddress } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCustomerSession();
    if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const orders = (await listOrders()).filter(
      (order) =>
        order.customerId === session.customer.id ||
        order.customer.email.toLowerCase() === session.customer.email,
    );
    return NextResponse.json({
      customer: session.customer,
      addresses: session.addresses,
      orders,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const parsed = addressSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const address = await saveAddress({
      ...parsed.data,
      customerId: session.customer.id,
      isDefault: parsed.data.isDefault ?? false,
    });
    return NextResponse.json({ address });
  } catch (error) {
    return errorResponse(error);
  }
}
