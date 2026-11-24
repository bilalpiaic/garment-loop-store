import { Suspense } from "react";
import Link from "next/link";
import { CustomerLoginForm } from "@/components/account/customer-login-form";
import { getCustomerSession } from "@/lib/platform";
import { redirect } from "next/navigation";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Sign in",
  description: "Sign in to your GarmentLoop customer account with an email code.",
  path: "/account/login",
  index: false,
});

export default async function AccountLoginPage() {
  const session = await getCustomerSession();
  if (session) redirect("/account");
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Customer account</p>
      <h1 className="mt-2 font-serif text-4xl">Sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Shoppers sign in with an email one-time code. Guest checkout still works without an account.
      </p>
      <p className="mt-3 rounded-lg border border-border/80 bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
        Store staff and owners use a separate password login —{" "}
        <Link href="/admin/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Staff / Admin sign in
        </Link>
        .
      </p>
      <div className="mt-8">
        <Suspense>
          <CustomerLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
