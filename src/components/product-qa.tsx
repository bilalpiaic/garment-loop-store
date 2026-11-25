"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProductQuestion } from "@/lib/commerce-types";

export function ProductQa({
  productId,
  productSlug,
  initialQuestions,
}: {
  productId: string;
  productSlug: string;
  initialQuestions: ProductQuestion[];
}) {
  const [questions] = useState(initialQuestions);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          productSlug,
          authorName: String(formData.get("authorName") ?? ""),
          authorEmail: String(formData.get("authorEmail") ?? ""),
          body: String(formData.get("body") ?? ""),
        }),
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Could not submit question.");
        return;
      }
      toast.success(data.message ?? "Question submitted for moderation.");
      (document.getElementById("qa-form") as HTMLFormElement | null)?.reset();
    } catch {
      toast.error("Network error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-16 border-t pt-12">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Q&A</p>
        <h2 className="mt-1 font-serif text-3xl">Ask about this piece</h2>
      </div>

      {questions.length === 0 ? (
        <p className="mb-8 text-sm text-muted-foreground">
          No published questions yet. Ask fit, fabric, or care — answers appear after moderation.
        </p>
      ) : (
        <ul className="mb-10 space-y-4">
          {questions.map((question) => (
            <li key={question.id} className="rounded-xl border p-4">
              <p className="text-sm font-medium">{question.body}</p>
              {question.answer ? (
                <p className="mt-3 rounded-lg bg-secondary/40 px-3 py-2 text-sm">
                  <span className="font-medium">GarmentLoop:</span> {question.answer}
                </p>
              ) : null}
              <p className="mt-3 text-xs text-muted-foreground">
                {question.authorName} · {new Date(question.createdAt).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form id="qa-form" action={onSubmit} className="max-w-xl space-y-4 rounded-xl border bg-card/50 p-5">
        <h3 className="font-serif text-2xl">Ask a question</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="qa-authorName">Name</Label>
            <Input id="qa-authorName" name="authorName" className="h-10" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qa-authorEmail">Email</Label>
            <Input id="qa-authorEmail" name="authorEmail" type="email" className="h-10" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="qa-body">Question</Label>
          <Textarea id="qa-body" name="body" rows={3} required minLength={10} />
        </div>
        <Button type="submit" className="h-11 px-6" disabled={pending}>
          {pending ? "Sending…" : "Submit question"}
        </Button>
      </form>
    </section>
  );
}
