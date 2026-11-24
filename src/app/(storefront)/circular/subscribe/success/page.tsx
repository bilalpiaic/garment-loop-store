import Link from "next/link";
import { SubscribeSuccess } from "@/components/circular/subscribe-success";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Subscription confirmed",
  description: "GarmentLoop circular subscription confirmation.",
  path: "/circular/subscribe/success",
  index: false,
});

export default async function SubscribeSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; sub?: string }>;
}) {
  const params = await searchParams;
  const sessionId = params.session_id ?? "";
  const subscriptionId = params.sub ?? "";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 space-y-6">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Circular</p>
      <h1 className="font-serif text-4xl">Subscription checkout</h1>
      {!sessionId || !subscriptionId ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Missing Stripe session details. If you completed payment, check your account circular
            page or contact the atelier.
          </p>
          <Link href="/circular/subscribe" className="underline underline-offset-4 text-sm">
            Back to plans
          </Link>
        </div>
      ) : (
        <SubscribeSuccess sessionId={sessionId} subscriptionId={subscriptionId} />
      )}
    </div>
  );
}
