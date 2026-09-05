import { handleAdminLogout } from "@/lib/auth-handlers";

export const dynamic = "force-dynamic";

export async function POST() {
  return handleAdminLogout();
}
