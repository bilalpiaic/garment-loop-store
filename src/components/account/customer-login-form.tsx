"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CUSTOMER_OTP_CODE } from "@/lib/identity";

export function CustomerLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/account";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState(CUSTOMER_OTP_CODE);
  const [step, setStep] = useState<"credentials" | "code">("credentials");
  const [pending, setPending] = useState(false);

  async function submitCredentials(event?: FormEvent) {
    event?.preventDefault();
    setPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as {
        error?: string;
        kind?: "admin" | "otp";
        code?: string;
      };
      if (!response.ok) {
        toast.error(data.error ?? "Could not sign in.");
        return;
      }
      if (data.kind === "admin") {
        toast.success("Signed in.");
        router.push("/admin");
        router.refresh();
        return;
      }
      setCode(data.code ?? CUSTOMER_OTP_CODE);
      setStep("code");
      toast.success(`Use code ${data.code ?? CUSTOMER_OTP_CODE}`);
    } finally {
      setPending(false);
    }
  }

  async function verify(event?: FormEvent) {
    event?.preventDefault();
    setPending(true);
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code || CUSTOMER_OTP_CODE }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "That code did not work.");
        return;
      }
      const destination = next.startsWith("/admin") ? "/account" : next;
      router.push(destination);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={step === "credentials" ? submitCredentials : verify} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-10"
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-10"
          autoComplete={step === "credentials" ? "current-password" : "off"}
        />
      </div>
      {step === "code" ? (
        <div className="space-y-2">
          <Label htmlFor="code">One-time code</Label>
          <Input
            id="code"
            inputMode="numeric"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="h-10 tracking-[0.3em]"
            placeholder="123456"
          />
          <p className="text-xs text-muted-foreground">
            Owner, admin, and staff skip this step. For store accounts, use{" "}
            <span className="font-medium text-foreground">123456</span> until email delivery is
            connected.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Staff matching owner/admin/staff credentials enter the console immediately. Everyone else
          confirms with OTP <span className="font-medium text-foreground">123456</span>, and the
          password is saved to their customer account.
        </p>
      )}
      <Button
        type="submit"
        className="h-11 w-full"
        disabled={pending || !email || !password}
      >
        {pending ? "Please wait…" : step === "credentials" ? "Continue" : "Sign in"}
      </Button>
      {step === "code" ? (
        <button
          type="button"
          className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => void submitCredentials()}
        >
          Resend code
        </button>
      ) : null}
    </form>
  );
}
