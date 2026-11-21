import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { listReturns } from "@/lib/platform";
import { ReturnsQueue } from "@/components/admin/returns-queue";

export const metadata = { title: "Returns" };

export default async function AdminReturnsPage() {
  const access = await loadAdminPage("orders.manage");
  if (access.forbidden) return <Forbidden />;
  const returns = await listReturns();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fulfillment</p>
        <h1 className="mt-1 font-serif text-3xl">Returns / RMA</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Customer portal requests land here alongside admin-created RMAs. Approve restocks
          inventory; mark refunds when payment is reversed. Carrier labels are Phase 2.
        </p>
      </div>
      <ReturnsQueue returns={returns} />
    </div>
  );
}
