import { NextResponse } from "next/server";
import { PlatformError, requireAdmin } from "@/lib/platform";
import type { Permission } from "@/lib/roles";

export function errorResponse(error: unknown) {
  if (error instanceof PlatformError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

export async function withAdmin(permission: Permission | undefined, fn: () => Promise<Response>) {
  try {
    const session = await requireAdmin(permission);
    void session;
    return await fn();
  } catch (error) {
    return errorResponse(error);
  }
}
