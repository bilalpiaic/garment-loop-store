import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { getTillControl } from "@/lib/platform";
import { TillConsole } from "@/components/admin/till-console";

export const metadata = { title: "Till" };

export default async function AdminTillPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const access = await loadAdminPage("till.manage");
  if (access.forbidden) return <Forbidden />;
  const { days } = await searchParams;
  const rangeDays = Number(days ?? "30");
  const snapshot = await getTillControl(Number.isFinite(rangeDays) ? rangeDays : 30);
  return <TillConsole snapshot={snapshot} rangeDays={snapshot.rangeDays} />;
}
