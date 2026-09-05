import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { settingsSchema } from "@/lib/admin-schemas";
import { getSettings, requireAdmin, updateSettings } from "@/lib/platform";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin("settings.manage");
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin("settings.manage");
    const parsed = settingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const settings = await updateSettings(parsed.data);
    return NextResponse.json({ settings });
  } catch (error) {
    return errorResponse(error);
  }
}
