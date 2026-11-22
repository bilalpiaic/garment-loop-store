import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { adminUserSchema } from "@/lib/admin-schemas";
import { listAdminUsers, requireAdmin, saveAdminUser } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin("users.manage");
    const users = await listAdminUsers();
    return NextResponse.json({ users });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin("users.manage");
    const parsed = adminUserSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const user = await saveAdminUser({
      ...parsed.data,
      actorRole: session.user.role,
      actorId: session.user.id,
    });
    return NextResponse.json({ user });
  } catch (error) {
    return errorResponse(error);
  }
}
