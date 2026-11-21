"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ProductReview } from "@/lib/commerce-types";
import { formatDateTime } from "@/lib/admin-nav";

export function ReviewModeration({ reviews }: { reviews: ProductReview[] }) {
  const router = useRouter();

  async function moderate(id: string, status: "approved" | "rejected") {
    const response = await fetch("/api/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(data.error ?? "Could not update review.");
      return;
    }
    toast.success(status === "approved" ? "Review published" : "Review rejected");
    router.refresh();
  }

  if (reviews.length === 0) {
    return <p className="text-sm text-muted-foreground">No reviews yet.</p>;
  }

  return (
    <ul className="space-y-4">
      {reviews.map((review) => (
        <li key={review.id} className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{review.title}</p>
              <p className="text-xs text-muted-foreground">
                {review.productSlug} · {review.authorName} · {formatDateTime(review.createdAt)}
              </p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {review.status}
            </Badge>
          </div>
          <p className="mt-2 text-sm">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
          <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>
          {review.status === "pending" ? (
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => moderate(review.id, "approved")}>
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => moderate(review.id, "rejected")}>
                Reject
              </Button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
