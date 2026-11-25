"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/lib/catalog";

export function ProductGallery({ images, title }: { images: ProductImage[]; title: string }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  if (!current) {
    return <div className="aspect-[3/4] bg-muted/60" />;
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] overflow-hidden bg-[color-mix(in_oklab,var(--secondary)_70%,var(--ivory))] ring-1 ring-champagne/20">
        <Image
          src={current.src}
          alt={current.alt || title}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
          onError={() => {
            if (active < images.length - 1) {
              setActive(active + 1);
            }
          }}
        />
      </div>
      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image.src}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden border",
                index === active ? "border-olive" : "border-transparent opacity-80 hover:opacity-100",
              )}
              aria-label={`View image ${index + 1}`}
            >
              <Image
                src={image.src}
                alt={image.alt || `${title} thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
