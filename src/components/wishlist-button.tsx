"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WishlistButton({
  productId,
  className,
}: {
  productId: string;
  className?: string;
}) {
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/wishlist");
        const data = (await response.json()) as { productIds?: string[] };
        if (!cancelled) {
          setActive((data.productIds ?? []).includes(productId));
          setReady(true);
        }
      } catch {
        if (!cancelled) setReady(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function toggle() {
    const next = !active;
    setActive(next);
    try {
      const response = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, action: next ? "add" : "remove" }),
      });
      if (!response.ok) {
        setActive(!next);
        toast.error("Could not update wishlist.");
        return;
      }
      toast.success(next ? "Saved to wishlist" : "Removed from wishlist");
    } catch {
      setActive(!next);
      toast.error("Network error.");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("size-10", className)}
      onClick={toggle}
      disabled={!ready}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={active}
    >
      <Heart className={cn("size-4", active ? "fill-current text-primary" : "")} />
    </Button>
  );
}
