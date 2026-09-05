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
    <div className="flex min-h-full bg-[#f4f1ec]">
      <aside className="hidden w-60 shrink-0 flex-col bg-[oklch(0.28_0.04_210)] text-white md:flex">
        <div className="px-5 py-6">
          <p className="font-serif text-2xl">GarmentLoop</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/60">Admin</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3 pb-6">
          {items.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm",
                  active ? "bg-white/15" : "text-white/75 hover:bg-white/10 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-xs">
          <p className="font-medium">{user.name}</p>
          <p className="text-white/60">{roleLabel(user.role)}</p>
          <button type="button" className="mt-3 text-white/80 underline-offset-4 hover:underline" onClick={signOut} disabled={pending}>
            {pending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-background px-4 py-3 md:px-8">
          <div className="flex flex-wrap gap-2 md:hidden">
            {items.slice(0, 5).map((item) => (
              <Link key={item.href} href={item.href} className="text-xs uppercase tracking-wide text-muted-foreground">
                {item.label}
              </Link>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              View store
            </Link>
            <Button size="sm" variant="outline" className="hidden md:inline-flex" render={<Link href="/admin/products/new" />}>
              Add product
            </Button>
          </div>
        </header>
        <div className="flex-1 px-4 py-6 md:px-8">{children}</div>
      </div>
    </div>
  );
}
