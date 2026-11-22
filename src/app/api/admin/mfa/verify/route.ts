import { handleAdminMfaVerify } from "@/lib/auth-handlers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleAdminMfaVerify(request);
}
