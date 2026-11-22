import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import {
  getCustomerSession,
  listCircularSubscriptionsForCustomer,
  listRepairsForCustomer,
  listTakeBacksForCustomer,
} from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const [takeBacks, repairs, subscriptions] = await Promise.all([
      listTakeBacksForCustomer(session.customer.id, session.customer.email),
      listRepairsForCustomer(session.customer.id, session.customer.email),
      listCircularSubscriptionsForCustomer(session.customer.id, session.customer.email),
    ]);
    return NextResponse.json({ takeBacks, repairs, subscriptions });
  } catch (error) {
    return errorResponse(error);
  }
}
