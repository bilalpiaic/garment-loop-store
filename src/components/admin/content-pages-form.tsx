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
  const [selected, setSelected] = useState(pages[0]?.slug ?? "");
  const [creating, setCreating] = useState(pages.length === 0);
  const current = pages.find((page) => page.slug === selected) ?? pages[0];
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    try {
      const title = String(formData.get("title") ?? "");
      const excerpt = String(formData.get("excerpt") ?? "");
      const body = String(formData.get("body") ?? "");
      const slugInput = String(formData.get("slug") ?? "").trim();
      const response = await fetch("/api/admin/pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: creating ? slugInput || undefined : selected,
          title,
          excerpt,
          body,
        }),
      });
      const data = (await response.json()) as { error?: string; page?: ContentPage };
      if (!response.ok) {
        toast.error(data.error ?? "Could not save page.");
        return;
      }
      toast.success(creating ? "Page created" : "Page saved");
      setCreating(false);
      if (data.page?.slug) setSelected(data.page.slug);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!selected || creating) return;
    if (!window.confirm(`Delete content page “${selected}”?`)) return;
    setPending(true);
    try {
      const response = await fetch(`/api/admin/pages?slug=${encodeURIComponent(selected)}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Could not delete page.");
        return;
      }
      toast.success("Page deleted");
      setSelected("");
      setCreating(true);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <div className="space-y-3">
        <ul className="space-y-1 text-sm">
          {pages.map((page) => (
            <li key={page.slug}>
              <button
                type="button"
                className={`w-full rounded-lg px-3 py-2 text-left ${
                  !creating && page.slug === selected
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
                onClick={() => {
                  setCreating(false);
                  setSelected(page.slug);
                }}
              >
                {page.title}
              </button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            setCreating(true);
            setSelected("");
          }}
        >
          New page
        </Button>
      </div>
      <form
        key={creating ? "new" : current?.slug ?? "empty"}
        action={onSubmit}
        className="space-y-4 rounded-xl border bg-card p-5"
      >
        {creating ? (
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              className="h-10"
              placeholder="about"
              pattern="[a-z0-9\\-]+"
              title="Lowercase letters, numbers, and hyphens"
            />
            <p className="text-xs text-muted-foreground">
              Optional — derived from the title when blank. Stored in MySQL platform state.
            </p>
          </div>
        ) : (
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            /{current?.slug}
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            className="h-10"
            defaultValue={creating ? "" : current?.title}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="excerpt">Excerpt</Label>
          <Input
            id="excerpt"
            name="excerpt"
            className="h-10"
            defaultValue={creating ? "" : current?.excerpt}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="body">Body</Label>
          <Textarea
            id="body"
            name="body"
            rows={12}
            defaultValue={creating ? "" : current?.body}
            required
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : creating ? "Create page" : "Save page"}
          </Button>
          {!creating && current ? (
            <Button type="button" variant="outline" disabled={pending} onClick={onDelete}>
              Delete
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
