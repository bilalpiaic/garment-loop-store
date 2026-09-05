import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { getSettings } from "@/lib/platform";
import { SettingsForm } from "@/components/admin/admin-forms";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const access = await loadAdminPage("settings.manage");
  if (access.forbidden) return <Forbidden />;
  const settings = await getSettings();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Store</p>
        <h1 className="mt-1 font-serif text-3xl">Settings</h1>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
