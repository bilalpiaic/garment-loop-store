import Link from "next/link";
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
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">GarmentLoop · Back office</p>
        <h1 className="mt-2 font-serif text-3xl">Staff / Admin sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Owners, admins, and staff sign in with <span className="font-medium text-foreground">email and password</span>
          — not a one-time code. Shoppers use customer login on the storefront.
        </p>
        <div className="mt-6">
          <AdminLoginForm />
        </div>
        <div className="mt-6 space-y-1 rounded-lg border border-dashed border-border/80 bg-secondary/30 px-3 py-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Demo credentials</p>
          <p>owner@garmentloop.store / GarmentLoop-Owner-2026</p>
          <p>admin@garmentloop.store / GarmentLoop-Admin-2026</p>
          <p>staff@garmentloop.store / GarmentLoop-Staff-2026</p>
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Looking for your orders?{" "}
          <Link href="/account/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Customer email-code sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
