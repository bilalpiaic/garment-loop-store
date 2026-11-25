"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { ProductQuestion } from "@/lib/commerce-types";
import { formatDateTime } from "@/lib/admin-nav";

export function QuestionModeration({ questions }: { questions: ProductQuestion[] }) {
  const router = useRouter();
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});

  async function moderate(id: string, status: "approved" | "rejected") {
    const response = await fetch("/api/questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(data.error ?? "Could not update question.");
      return;
    }
    toast.success(status === "approved" ? "Question published" : "Question rejected");
    router.refresh();
  }

  async function answer(id: string) {
    const text = (answerDrafts[id] ?? "").trim();
    if (text.length < 2) {
      toast.error("Write a short answer.");
      return;
    }
    const response = await fetch("/api/questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, answer: text, status: "approved" }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(data.error ?? "Could not save answer.");
      return;
    }
    toast.success("Answer published");
    router.refresh();
  }

  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground">No product questions yet.</p>;
  }

  return (
    <ul className="space-y-4">
      {questions.map((question) => (
        <li key={question.id} className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{question.body}</p>
              <p className="text-xs text-muted-foreground">
                {question.productSlug} · {question.authorName} · {formatDateTime(question.createdAt)}
              </p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {question.status}
            </Badge>
          </div>
          {question.answer ? (
            <p className="mt-3 rounded-lg bg-secondary/50 px-3 py-2 text-sm">
              <span className="font-medium">Answer:</span> {question.answer}
            </p>
          ) : null}
          <div className="mt-4 space-y-2">
            <Textarea
              rows={2}
              placeholder="Public answer…"
              value={answerDrafts[question.id] ?? question.answer ?? ""}
              onChange={(event) =>
                setAnswerDrafts((current) => ({ ...current, [question.id]: event.target.value }))
              }
            />
            <div className="flex flex-wrap gap-2">
              {question.status === "pending" ? (
                <>
                  <Button size="sm" onClick={() => moderate(question.id, "approved")}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => moderate(question.id, "rejected")}>
                    Reject
                  </Button>
                </>
              ) : null}
              <Button size="sm" variant="outline" onClick={() => answer(question.id)}>
                Save answer
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
