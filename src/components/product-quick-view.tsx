"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { comparePrice, lowestPrice } from "@/lib/catalog";
import { Price } from "@/components/price";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ProductQuickView({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const price = lowestPrice(product);
  const compare = comparePrice(product);
  const image = product.images[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="pointer-events-auto absolute inset-x-3 bottom-3 translate-y-2 rounded-md bg-ink/85 px-3 py-2 text-center text-xs tracking-[0.14em] text-cream uppercase opacity-0 backdrop-blur-sm transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100"
            aria-label={`Quick look at ${product.title}`}
          />
        }
      >
        Quick look
      </DialogTrigger>
      <DialogContent className="atelier-panel gap-0 overflow-hidden border-champagne/25 p-0 sm:max-w-2xl">
        <div className="grid sm:grid-cols-2">
          <div className="relative aspect-[3/4] bg-secondary sm:aspect-auto sm:min-h-[420px]">
            {image ? (
              <Image
                src={image.src}
                alt={image.alt ?? product.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 320px"
              />
            ) : null}
          </div>
          <div className="flex flex-col justify-between p-6">
            <DialogHeader className="space-y-3 text-left">
              <p className="text-[11px] uppercase tracking-[0.2em] text-sage">Quick look</p>
              <DialogTitle className="font-serif text-3xl font-normal tracking-tight">
                {product.title}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                {product.subtitle}
              </DialogDescription>
              <p className="pt-1 text-lg font-medium">
                <Price amountPkr={price} compareAtPkr={compare} />
              </p>
            </DialogHeader>
            <div className="mt-8 flex flex-col gap-2">
              <Button
                className="btn-lux btn-shimmer h-11"
                nativeButton={false}
                render={<Link href={`/product/${product.slug}`} onClick={() => setOpen(false)} />}
              >
                View details
              </Button>
              <Button type="button" variant="ghost" className="h-10" onClick={() => setOpen(false)}>
                Keep browsing
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
