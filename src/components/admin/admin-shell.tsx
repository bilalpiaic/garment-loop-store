"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV } from "@/lib/admin-nav";
import { can, roleLabel, type Role } from "@/lib/roles";
import { Button } from "@/components/ui/button";

export function AdminShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: Role };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const items = ADMIN_NAV.filter((item) => can(user.role, item.permission));

  async function signOut() {
    setPending(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-full bg-[color:var(--background)]">
      <aside className="hidden w-60 shrink-0 flex-col bg-ink text-cream md:flex">
        <div className="px-5 py-6">
          <p className="font-serif text-2xl tracking-tight">GarmentLoop</p>
          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-champagne/80">Back office</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3 pb-6">
          {items.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-cream/12 text-cream ring-1 ring-champagne/25"
                    : "text-cream/70 hover:bg-cream/8 hover:text-cream",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-cream/10 px-5 py-4 text-xs">
          <p className="font-medium">{user.name}</p>
          <p className="text-champagne/70">{roleLabel(user.role)}</p>
          <button
            type="button"
            className="mt-3 text-cream/80 underline-offset-4 hover:underline"
            onClick={signOut}
            disabled={pending}
          >
            {pending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border/80 bg-[color-mix(in_oklab,var(--cream)_90%,transparent)] px-4 py-3 backdrop-blur-sm md:px-8">
          <div className="flex flex-wrap gap-2 md:hidden">
            {items.slice(0, 5).map((item) => (
              <Link key={item.href} href={item.href} className="text-xs uppercase tracking-wide text-muted-foreground">
                {item.label}
              </Link>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-olive">
              View store
            </Link>
            <Button
              size="sm"
              variant="outline"
              className="hidden border-olive/30 text-olive hover:bg-olive hover:text-cream md:inline-flex"
              nativeButton={false}
              render={<Link href="/admin/products/new" />}
            >
              Add product
            </Button>
          </div>
        </header>
        <div className="flex-1 px-4 py-6 md:px-8">{children}</div>
      </div>
    </div>
  );
}
