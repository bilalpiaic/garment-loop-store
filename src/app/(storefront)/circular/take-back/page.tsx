import type { Metadata } from "next";
import Link from "next/link";
import { CircularStatusLookup } from "@/components/circular/status-lookup";
import { TakeBackForm } from "@/components/circular/take-back-form";
import { getCustomerSession } from "@/lib/platform";

export const metadata: Metadata = {
  title: "Take-back",
  description: "Request a GarmentLoop garment take-back with status tracking.",
};

export default async function TakeBackPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string; email?: string }>;
}) {
  const params = await searchParams;
  const session = await getCustomerSession();

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 space-y-12">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Link href="/circular" className="underline-offset-4 hover:underline">
            Circular
          </Link>{" "}
          · Take-back
        </p>
        <h1 className="mt-2 font-serif text-4xl">Return a piece to the loop</h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Tell us what you are sending back. We schedule pickup, estimate credit, and route
          garments to refresh or recycling.
        </p>
      </div>

      <TakeBackForm
        defaultName={session?.customer.fullName ?? ""}
        defaultEmail={session?.customer.email ?? ""}
      />

      <section className="space-y-4 border-t border-border/70 pt-10">
        <h2 className="font-serif text-2xl">Track a request</h2>
        <CircularStatusLookup
          kind="take-back"
          initialId={params.track ?? ""}
          initialEmail={params.email ?? session?.customer.email ?? ""}
        />
      </section>
    </div>
  );
}
