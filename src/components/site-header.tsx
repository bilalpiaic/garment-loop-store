"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Menu, Search, ShoppingBag } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { categories, collections } from "@/lib/catalog";
import { useCartStore, usePreferenceStore } from "@/store/store";
import { useHydrated } from "@/hooks/use-hydrated";
import { SearchDialog } from "@/components/search-dialog";
import { CartDrawer } from "@/components/cart-drawer";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/shop", label: "Shop" },
  { href: "/collection/winter-collection", label: "Winter" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const items = useCartStore((state) => state.items);
  const hydrated = useHydrated();
  const currency = usePreferenceStore((state) => state.currency);
  const setCurrency = usePreferenceStore((state) => state.setCurrency);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const count = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  return (
    <>
      <div className="bg-primary text-primary-foreground">
        <p className="mx-auto max-w-6xl px-4 py-2 text-center text-[11px] tracking-[0.16em] uppercase sm:text-xs">
          Winter collection now live · Free delivery over PKR 8,000
        </p>
      </div>
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" />
                }
              >
                <Menu className="size-5" />
              </SheetTrigger>
              {mobileOpen ? (
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle className="font-serif text-2xl font-normal tracking-tight">
                    GarmentLoop
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4 pb-8">
                  {nav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-md px-2 py-3 text-base"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <p className="mt-4 px-2 text-xs uppercase tracking-widest text-muted-foreground">
                    Categories
                  </p>
                  {categories.map((category) => (
                    <Link
                      key={category.slug}
                      href={`/category/${category.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-md px-2 py-2 text-sm"
                    >
                      {category.name}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
              ) : null}
            </Sheet>
            <Link href="/" className="font-serif text-xl tracking-tight sm:text-2xl">
              GarmentLoop
            </Link>
          </div>
          <nav className="hidden items-center gap-8 text-sm md:flex">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-primary">
                {item.label}
              </Link>
            ))}
            <div className="group relative">
              <button type="button" className="hover:text-primary">
                Categories
              </button>
              <div className="invisible absolute left-0 top-full z-50 min-w-48 rounded-lg border bg-popover p-2 opacity-0 shadow-md transition group-hover:visible group-hover:opacity-100">
                {categories.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/category/${category.slug}`}
                    className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                  >
                    {category.name}
                  </Link>
                ))}
                {collections.map((collection) => (
                  <Link
                    key={collection.slug}
                    href={`/collection/${collection.slug}`}
                    className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
                  >
                    {collection.name}
                  </Link>
                ))}
              </div>
            </div>
          </nav>
          <div className="flex items-center gap-1">
            <div className="mr-1 hidden overflow-hidden rounded-full border text-[11px] font-medium sm:flex">
              {(["PKR", "USD"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setCurrency(code)}
                  className={cn(
                    "px-2.5 py-1",
                    currency === code ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {code}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="Search"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
              onClick={() => setSearchOpen(true)}
            >
              <Search className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Cart"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag className="size-5" />
              {hydrated && count > 0 ? (
                <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {count}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </header>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </>
  );
}
