import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { listAdminUsers } from "@/lib/platform";
import { AdminUserForm } from "@/components/admin/admin-forms";
import { roleLabel } from "@/lib/roles";
import { formatDateTime } from "@/lib/admin-nav";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const access = await loadAdminPage("users.manage");
  if (access.forbidden) return <Forbidden />;
  const users = await listAdminUsers();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Access</p>
        <h1 className="mt-1 font-serif text-3xl">Users & roles</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Owner has full access. Admin can manage catalog and orders. Staff can fulfill orders and
          adjust inventory.
        </p>
      </div>
      <AdminUserForm />
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Last login</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t">
                <td className="px-4 py-3 font-medium">{user.name}</td>
                <td>{user.email}</td>
                <td>{roleLabel(user.role)}</td>
                <td>{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "—"}</td>
                <td>
                  <Badge variant={user.active ? "default" : "secondary"}>
                    {user.active ? "Active" : "Disabled"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
