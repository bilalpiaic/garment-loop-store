import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { exportCustomerData, getCustomerSession } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    if (session.customer.anonymizedAt) {
      return NextResponse.json({ error: "Account already deleted." }, { status: 410 });
    }
    const data = await exportCustomerData(session.customer.id);
    return NextResponse.json(data, {
      headers: {
        "Content-Disposition": `attachment; filename="garmentloop-export-${session.customer.id}.json"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
