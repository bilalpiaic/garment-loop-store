"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProductReview } from "@/lib/commerce-types";

export function ProductReviews({
  productId,
  productSlug,
  initialReviews,
}: {
  productId: string;
  productSlug: string;
  initialReviews: ProductReview[];
}) {
  const [reviews] = useState(initialReviews);
  const [pending, setPending] = useState(false);
  const average =
    reviews.length === 0
      ? 0
      : reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  async function onSubmit(formData: FormData) {
    setPending(true);
    try {
      const photoUrls = [1, 2, 3]
        .map((index) => String(formData.get(`photoUrl${index}`) ?? "").trim())
        .filter(Boolean);
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          productSlug,
          authorName: String(formData.get("authorName") ?? ""),
          authorEmail: String(formData.get("authorEmail") ?? ""),
          rating: Number(formData.get("rating") ?? 5),
          title: String(formData.get("title") ?? ""),
          body: String(formData.get("body") ?? ""),
          photoUrls: photoUrls.length ? photoUrls : undefined,
        }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Could not submit review.");
        return;
      }
      toast.success(data.message ?? "Review submitted for moderation.");
      (document.getElementById("review-form") as HTMLFormElement | null)?.reset();
    } catch {
      toast.error("Network error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-16 border-t pt-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reviews</p>
          <h2 className="mt-1 font-serif text-3xl">What wearers say</h2>
        </div>
        {reviews.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {average.toFixed(1)} / 5 · {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      {reviews.length === 0 ? (
        <p className="mb-8 text-sm text-muted-foreground">
          No published reviews yet. Be the first — submissions appear after moderation.
        </p>
      ) : (
        <ul className="mb-10 space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{review.title}</p>
                <p className="text-xs text-muted-foreground">
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>
              {review.photoUrls && review.photoUrls.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {review.photoUrls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt=""
                      className="h-16 w-16 rounded-md object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              ) : null}
              {review.adminReply ? (
                <p className="mt-3 rounded-lg bg-secondary/40 px-3 py-2 text-sm">
                  <span className="font-medium">GarmentLoop:</span> {review.adminReply}
                </p>
              ) : null}
              <p className="mt-3 text-xs text-muted-foreground">
                {review.authorName} · {new Date(review.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form id="review-form" action={onSubmit} className="max-w-xl space-y-4 rounded-xl border bg-card/50 p-5">
        <h3 className="font-serif text-2xl">Write a review</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="authorName">Name</Label>
            <Input id="authorName" name="authorName" className="h-10" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="authorEmail">Email</Label>
            <Input id="authorEmail" name="authorEmail" type="email" className="h-10" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rating">Rating</Label>
          <select
            id="rating"
            name="rating"
            className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
            defaultValue="5"
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value} star{value === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Headline</Label>
          <Input id="title" name="title" className="h-10" required minLength={3} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="body">Review</Label>
          <Textarea id="body" name="body" rows={4} required minLength={10} />
        </div>
        <div className="space-y-2">
          <Label>Photo URLs (optional, https, max 3)</Label>
          <div className="grid gap-2">
            <Input name="photoUrl1" type="url" placeholder="https://…" className="h-10" />
            <Input name="photoUrl2" type="url" placeholder="https://…" className="h-10" />
            <Input name="photoUrl3" type="url" placeholder="https://…" className="h-10" />
          </div>
        </div>
        <Button type="submit" className="h-11 px-6" disabled={pending}>
          {pending ? "Sending…" : "Submit for moderation"}
        </Button>
      </form>
    </section>
  );
}
