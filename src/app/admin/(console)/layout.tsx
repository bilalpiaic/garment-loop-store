import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSession } from "@/lib/platform";

export const dynamic = "force-dynamic";

export default async function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <AdminShell user={session.user}>{children}</AdminShell>;
}
