"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ContentPage } from "@/lib/platform-state";

export function ContentPagesForm({ pages }: { pages: ContentPage[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(pages[0]?.slug ?? "sustainability");
  const current = pages.find((page) => page.slug === selected) ?? pages[0];
  const [pending, setPending] = useState(false);

  if (!current) {
    return <p className="text-sm text-muted-foreground">No content pages seeded.</p>;
  }

  async function onSubmit(formData: FormData) {
    setPending(true);
    try {
      const response = await fetch("/api/admin/pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: selected,
          title: String(formData.get("title") ?? ""),
          excerpt: String(formData.get("excerpt") ?? ""),
          body: String(formData.get("body") ?? ""),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Could not save page.");
        return;
      }
      toast.success("Page saved");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <ul className="space-y-1 text-sm">
        {pages.map((page) => (
          <li key={page.slug}>
            <button
              type="button"
              className={`w-full rounded-lg px-3 py-2 text-left ${
                page.slug === selected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
              onClick={() => setSelected(page.slug)}
            >
              {page.title}
            </button>
          </li>
        ))}
      </ul>
      <form key={current.slug} action={onSubmit} className="space-y-4 rounded-xl border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">/{current.slug}</p>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" className="h-10" defaultValue={current.title} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="excerpt">Excerpt</Label>
          <Input id="excerpt" name="excerpt" className="h-10" defaultValue={current.excerpt} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="body">Body</Label>
          <Textarea id="body" name="body" rows={12} defaultValue={current.body} required />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save page"}
        </Button>
      </form>
    </div>
  );
}
