import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { errorResponse } from "@/lib/http";
import { CUSTOMER_COOKIE } from "@/lib/identity";
import { anonymizeCustomer, getCustomerSession } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const result = await anonymizeCustomer(session.customer.id);
    const jar = await cookies();
    jar.delete(CUSTOMER_COOKIE);
    return NextResponse.json({
      ok: true,
      already: result.already,
      message: result.already
        ? "Account was already anonymized."
        : "Account anonymized. Order totals are retained for records.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
