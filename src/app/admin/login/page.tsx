import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getAdminSession } from "@/lib/platform";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin sign in",
};

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin");
  return (
    <div className="flex min-h-full items-center justify-center bg-[#f4f1ec] px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border bg-background p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">GarmentLoop</p>
        <h1 className="mt-2 font-serif text-3xl">Admin sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Owner, admin, and staff accounts use email and password. Customer OTP login is on the
          storefront.
        </p>
        <div className="mt-6">
          <AdminLoginForm />
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Seeded locally: owner@garmentloop.store / GarmentLoop-Owner-2026
        </p>
      </div>
    </div>
  );
}
