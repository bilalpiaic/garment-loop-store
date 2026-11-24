import type { ReactNode } from "react";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Wishlist",
  description: "Saved GarmentLoop pieces in this browser.",
  path: "/wishlist",
  index: false,
});

export default function WishlistLayout({ children }: { children: ReactNode }) {
  return children;
}
