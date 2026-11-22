"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { ProductReview } from "@/lib/commerce-types";
import { formatDateTime } from "@/lib/admin-nav";

export function ReviewModeration({ reviews }: { reviews: ProductReview[] }) {
  const router = useRouter();
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

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

  async function reply(id: string) {
    const adminReply = (replyDrafts[id] ?? "").trim();
    if (adminReply.length < 2) {
      toast.error("Write a short public reply.");
      return;
    }
    const response = await fetch("/api/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, adminReply }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(data.error ?? "Could not save reply.");
      return;
    }
    toast.success("Public reply saved");
    router.refresh();
  }

  async function remove(id: string) {
    const response = await fetch(`/api/reviews?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(data.error ?? "Could not delete review.");
      return;
    }
    toast.success("Review deleted");
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
          <p className="mt-2 text-sm">
            {"★".repeat(review.rating)}
            {"☆".repeat(5 - review.rating)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>
          {review.adminReply ? (
            <p className="mt-3 rounded-lg bg-secondary/50 px-3 py-2 text-sm">
              <span className="font-medium">House reply:</span> {review.adminReply}
            </p>
          ) : null}
          <div className="mt-4 space-y-2">
            <Textarea
              rows={2}
              placeholder="Public reply from the house…"
              value={replyDrafts[review.id] ?? review.adminReply ?? ""}
              onChange={(event) =>
                setReplyDrafts((current) => ({ ...current, [review.id]: event.target.value }))
              }
            />
            <div className="flex flex-wrap gap-2">
              {review.status === "pending" ? (
                <>
                  <Button size="sm" onClick={() => moderate(review.id, "approved")}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => moderate(review.id, "rejected")}>
                    Reject
                  </Button>
                </>
              ) : null}
              <Button size="sm" variant="outline" onClick={() => reply(review.id)}>
                Save reply
              </Button>
              <Button size="sm" variant="destructive" onClick={() => remove(review.id)}>
                Delete
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
