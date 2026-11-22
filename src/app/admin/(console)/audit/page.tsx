import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { listAuditLogs } from "@/lib/platform";
import { AuditLogTable } from "@/components/admin/audit-log-table";

export const metadata = { title: "Audit log" };

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; actor?: string; entity?: string; q?: string }>;
}) {
  const access = await loadAdminPage("audit.view");
  if (access.forbidden) return <Forbidden />;
  const filters = await searchParams;
  const logs = await listAuditLogs({
    action: filters.action,
    actorEmail: filters.actor,
    entity: filters.entity,
    q: filters.q,
    limit: 150,
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Security</p>
        <h1 className="mt-1 font-serif text-3xl">Audit log</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Who changed what and when across admin mutations (products, inventory, orders, users, MFA,
          CSV import, settings).
        </p>
      </div>
      <AuditLogTable initialLogs={logs} initialFilters={filters} />
    </div>
  );
}
