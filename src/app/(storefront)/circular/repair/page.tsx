import Link from "next/link";
import { CircularStatusLookup } from "@/components/circular/status-lookup";
import { RepairForm } from "@/components/circular/repair-form";
import { getCustomerSession } from "@/lib/platform";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Repair booking",
  description: "Request a GarmentLoop atelier repair with quote and scheduling.",
  path: "/circular/repair",
});

export default async function RepairPage({
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
          · Repair
        </p>
        <h1 className="mt-2 font-serif text-4xl">Atelier repair booking</h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Describe the garment and the issue. Ops will quote and propose an appointment — Repair+
          members get priority slots.
        </p>
      </div>

      <RepairForm
        defaultName={session?.customer.fullName ?? ""}
        defaultEmail={session?.customer.email ?? ""}
      />

      <section className="space-y-4 border-t border-border/70 pt-10">
        <h2 className="font-serif text-2xl">Track a repair</h2>
        <CircularStatusLookup
          kind="repair"
          initialId={params.track ?? ""}
          initialEmail={params.email ?? session?.customer.email ?? ""}
        />
      </section>
    </div>
  );
}
