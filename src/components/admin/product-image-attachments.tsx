"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductImage } from "@/lib/catalog";
import { isProductImageSrc } from "@/lib/product-images";

export function ProductImageAttachments({
  images,
  onChange,
  productTitle,
}: {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  productTitle: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [urlAlt, setUrlAlt] = useState("");

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setUploading(true);
    const added: ProductImage[] = [];
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/admin/uploads", {
          method: "POST",
          body: form,
        });
        const data = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !data.url) {
          toast.error(data.error ?? `Could not upload ${file.name}.`);
          continue;
        }
        added.push({
          src: data.url,
          alt: productTitle.trim() || file.name.replace(/\.[^.]+$/, ""),
        });
      }
      if (added.length > 0) {
        onChange([...images, ...added]);
        toast.success(added.length === 1 ? "Image attached." : `${added.length} images attached.`);
      }
    } finally {
      setUploading(false);
    }
  }

  function addUrl() {
    const src = urlValue.trim();
    if (!isProductImageSrc(src)) {
      toast.error("Paste a valid image URL (https://…) or upload a file.");
      return;
    }
    onChange([...images, { src, alt: urlAlt.trim() || productTitle.trim() || "Product image" }]);
    setUrlValue("");
    setUrlAlt("");
  }

  function update(index: number, patch: Partial<ProductImage>) {
    onChange(images.map((image, i) => (i === index ? { ...image, ...patch } : image)));
  }

  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= images.length) return;
    const copy = [...images];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item!);
    onChange(copy);
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Images</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload photos from your computer, or paste an HTTPS URL. The first image is the storefront
          cover.
        </p>
      </div>
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center text-sm transition hover:bg-muted/40">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          multiple
          className="sr-only"
          disabled={uploading}
          onChange={(event) => {
            if (event.target.files) void uploadFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <span className="font-medium">{uploading ? "Uploading…" : "Attach images"}</span>
        <span className="mt-1 text-xs text-muted-foreground">JPEG, PNG, WebP, GIF, or AVIF · up to 4.5 MB each</span>
      </label>
      {images.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {images.map((image, index) => (
            <li key={`${image.src}-${index}`} className="space-y-2 rounded-xl border p-3">
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.src} alt={image.alt} className="size-full object-cover" />
              </div>
              <Input
                value={image.alt}
                onChange={(event) => update(index, { alt: event.target.value })}
                placeholder="Alt text"
                className="h-9"
              />
              <p className="truncate text-[11px] text-muted-foreground">{image.src}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <button type="button" className="underline-offset-4 hover:underline" onClick={() => move(index, -1)}>
                  Up
                </button>
                <button type="button" className="underline-offset-4 hover:underline" onClick={() => move(index, 1)}>
                  Down
                </button>
                <button
                  type="button"
                  className="text-destructive underline-offset-4 hover:underline"
                  onClick={() => onChange(images.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No images yet. Attach at least one before saving.</p>
      )}
      <div className="grid gap-2 rounded-xl border p-3 md:grid-cols-[1fr_1fr_auto]">
        <Input
          value={urlValue}
          onChange={(event) => setUrlValue(event.target.value)}
          placeholder="https://… image URL"
          className="h-10"
        />
        <Input
          value={urlAlt}
          onChange={(event) => setUrlAlt(event.target.value)}
          placeholder="Alt text"
          className="h-10"
        />
        <Button type="button" variant="outline" className="h-10" onClick={addUrl}>
          Add URL
        </Button>
      </div>
    </div>
  );
}
