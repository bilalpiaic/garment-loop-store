import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import {
  listCircularSubscriptions,
  listRepairs,
  listTakeBacks,
  shouldUseMockCircularSubscription,
} from "@/lib/platform";
import { CircularQueues } from "@/components/admin/circular-queues";
import { stripeConfigured } from "@/lib/stripe";

export const metadata = { title: "Circular" };

export default async function AdminCircularPage() {
  const access = await loadAdminPage("orders.manage");
  if (access.forbidden) return <Forbidden />;

  const [takeBacks, repairs, subscriptions] = await Promise.all([
    listTakeBacks(),
    listRepairs(),
    listCircularSubscriptions(),
  ]);

  const mockMode = shouldUseMockCircularSubscription();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Circular</p>
        <h1 className="mt-1 font-serif text-3xl">Take-back · Repair · Subscriptions</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Manage circular wardrobe requests. Billing:{" "}
          {mockMode
            ? "mock mode (no Stripe keys or CIRCULAR_SUBSCRIPTIONS_MOCK)"
            : stripeConfigured()
              ? "Stripe subscription checkout"
              : "mock"}
          .
        </p>
      </div>
      <CircularQueues takeBacks={takeBacks} repairs={repairs} subscriptions={subscriptions} />
    </div>
  );
}
