import { Suspense } from "react";
import { CustomerLoginForm } from "@/components/account/customer-login-form";
import { getCustomerSession } from "@/lib/platform";
import { redirect } from "next/navigation";

export const metadata = { title: "Sign in" };

export default async function AccountLoginPage() {
  const session = await getCustomerSession();
  if (session) redirect("/account");
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Account</p>
      <h1 className="mt-2 font-serif text-4xl">Sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Passwordless login with a one-time code. Guest checkout still works without an account. Use
        code 123456 for any email until email delivery is connected.
      </p>
      <div className="mt-8">
        <Suspense>
          <CustomerLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
