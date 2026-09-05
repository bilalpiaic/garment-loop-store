"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { countries } from "@/lib/site";

export function AddressForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function onSubmit(formData: FormData) {
    setPending(true);
    try {
      const response = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: String(formData.get("fullName") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          country: String(formData.get("country") ?? "PK"),
          city: String(formData.get("city") ?? ""),
          area: String(formData.get("area") ?? ""),
          address: String(formData.get("address") ?? ""),
          isDefault: true,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) toast.error(data.error ?? "Could not save address.");
      else {
        toast.success("Address saved.");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }
  return (
    <form action={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" className="h-10" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" className="h-10" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <select id="country" name="country" defaultValue="PK" className="h-10 w-full rounded-lg border px-3 text-sm">
          {countries.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" className="h-10" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="area">Area</Label>
        <Input id="area" name="area" className="h-10" required />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="address">Street address</Label>
        <Textarea id="address" name="address" rows={2} required />
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save address"}
        </Button>
      </div>
    </form>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
