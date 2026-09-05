import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/platform";
import { can, type Permission } from "@/lib/roles";

export async function loadAdminPage(permission?: Permission) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (permission && !can(session.user.role, permission)) {
    return { session, forbidden: true as const };
  }
  return { session, forbidden: false as const };
}

export function Forbidden() {
  return (
    <div className="rounded-xl border bg-card px-6 py-16 text-center">
      <p className="font-serif text-3xl">Not available for this role</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Your account can view orders and inventory. Ask the owner to grant a higher role for catalog
        or user management.
      </p>
    </div>
  );
}
