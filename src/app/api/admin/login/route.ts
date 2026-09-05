import { handleAdminLogin } from "@/lib/auth-handlers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleAdminLogin(request);
}
