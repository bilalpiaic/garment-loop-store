"use client";

import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWishlistStore } from "@/store/store";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";

export function WishlistButton({
  productId,
  className,
  variant = "outline",
}: {
  productId: string;
  className?: string;
  variant?: "outline" | "ghost";
}) {
  const hydrated = useHydrated();
  const has = useWishlistStore((state) => state.has(productId));
  const toggle = useWishlistStore((state) => state.toggle);

  async function onToggle() {
    const nextHas = !has;
    toggle(productId);
    const productIds = useWishlistStore.getState().productIds;
    toast.success(nextHas ? "Saved to wishlist" : "Removed from wishlist");
    try {
      await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds }),
      });
    } catch {
      /* guest local persist is enough */
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size="icon"
      className={cn("size-10", className)}
      aria-label={has ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={hydrated ? has : false}
      onClick={onToggle}
    >
      <Heart className={cn("size-4", hydrated && has && "fill-current text-destructive")} />
    </Button>
  );
}
