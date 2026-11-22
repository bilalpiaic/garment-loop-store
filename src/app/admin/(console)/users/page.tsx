import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { listAdminUsers } from "@/lib/platform";
import { AdminUserForm } from "@/components/admin/admin-forms";
import { AdminUserRow } from "@/components/admin/admin-crud";
import { formatDateTime } from "@/lib/admin-nav";

export const metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const access = await loadAdminPage("users.manage");
  if (access.forbidden) return <Forbidden />;
  const users = await listAdminUsers();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Access</p>
        <h1 className="mt.1 font-serif text-3xl">Users & roles</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Owner has full access. Admin can manage catalog and orders. Staff can fulfill orders and
          adjust inventory. Invite staff below, then change role or deactivate from the table.
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
              <th>Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <AdminUserRow
                key={user.id}
                user={{
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  role: user.role,
                  active: user.active,
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
      <ul className="text-xs text-muted-foreground">
        {users.map((user) => (
          <li key={`${user.id}-meta`}>
            {user.email}: last login {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "never"}
          </li>
        ))}
      </ul>
    </div>
  );
}
