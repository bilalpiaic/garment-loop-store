import { Suspense } from "react";
import { CustomerLoginForm } from "@/components/account/customer-login-form";
import { getAdminSession, getCustomerSession } from "@/lib/platform";
import { redirect } from "next/navigation";

export const metadata = { title: "Sign in" };

export default async function AccountLoginPage() {
  const [customer, admin] = await Promise.all([getCustomerSession(), getAdminSession()]);
  if (admin) redirect("/admin");
  if (customer) redirect("/account");
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Account</p>
      <h1 className="mt-2 font-serif text-4xl">Sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Email and password first. Owner, admin, and staff go straight to the console. Customer
        accounts confirm with OTP 123456, then the password is stored. Guest checkout still works
        without an account.
      </p>
      <div className="mt-8">
        <Suspense>
          <CustomerLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
