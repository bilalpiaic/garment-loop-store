import Link from "next/link";
import { SubscribeForm } from "@/components/circular/subscribe-form";
import { CIRCULAR_PLANS } from "@/lib/circular";
import { getCustomerSession, shouldUseMockCircularSubscription } from "@/lib/platform";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Circular subscriptions",
  description: "Care, Repair+, and Recycle Loop memberships from GarmentLoop.",
  path: "/circular/subscribe",
});

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const params = await searchParams;
  const session = await getCustomerSession();
  const mockMode = shouldUseMockCircularSubscription();

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 space-y-10">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Link href="/circular" className="underline-offset-4 hover:underline">
            Circular
          </Link>{" "}
          · Subscribe
        </p>
        <h1 className="mt-2 font-serif text-4xl">Stay in the loop</h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Monthly memberships for care kits, repair credits, and priority take-back.
        </p>
      </div>

      <SubscribeForm
        plans={CIRCULAR_PLANS}
        mockMode={mockMode}
        defaultName={session?.customer.fullName ?? ""}
        defaultEmail={session?.customer.email ?? ""}
        cancelled={params.cancelled === "1"}
      />
    </div>
  );
}
