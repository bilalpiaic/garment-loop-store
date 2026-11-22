import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { MfaSecurityPanel } from "@/components/admin/mfa-security-panel";
import { adminMfaRequiredByPolicy } from "@/lib/totp";

export const metadata = { title: "Security" };

export default async function AdminSecurityPage() {
  const access = await loadAdminPage("dashboard.view");
  if (access.forbidden) return <Forbidden />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Account</p>
        <h1 className="mt-1 font-serif text-3xl">Security</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Manage TOTP multi-factor authentication for your admin account.
          {adminMfaRequiredByPolicy()
            ? " Policy ADMIN_MFA_REQUIRED is on — owner/admin must use MFA."
            : " Set ADMIN_MFA_REQUIRED=1 to require MFA for owner/admin at login."}
        </p>
      </div>
      <MfaSecurityPanel />
    </div>
  );
}
