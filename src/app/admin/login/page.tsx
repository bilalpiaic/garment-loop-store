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
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <div className="atelier-panel w-full max-w-md rounded-lg p-8">
        <p className="font-serif text-2xl text-ink">GarmentLoop</p>
        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-champagne">Back office</p>
        <h1 className="mt-4 font-serif text-3xl text-balance">Staff / Admin sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Owners, admins, and staff sign in with{" "}
          <span className="font-medium text-foreground">email and password</span>
          — not a one-time code. Shoppers use customer login on the storefront.
        </p>
        <div className="mt-6">
          <AdminLoginForm />
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Looking for your orders?{" "}
          <Link href="/account/login" className="font-medium text-olive underline-offset-4 hover:underline">
            Customer email-code sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
