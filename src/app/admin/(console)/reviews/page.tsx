import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { listReviewsForAdmin } from "@/lib/platform";
import { ReviewModeration } from "@/components/admin/review-moderation";

export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  const access = await loadAdminPage("products.manage");
  if (access.forbidden) return <Forbidden />;
  const reviews = await listReviewsForAdmin();
  const pending = reviews.filter((review) => review.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Merchandising</p>
        <h1 className="mt-1 font-serif text-3xl">Reviews</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {pending} pending · {reviews.length} total
        </p>
      </div>
      <ReviewModeration reviews={reviews} />
    </div>
  );
}
