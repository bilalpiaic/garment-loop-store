"use client";

import { useState } from "react";
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
  const [code, setCode] = useState(CUSTOMER_OTP_CODE);
  const [step, setStep] = useState<"email" | "code">("email");
  const [pending, setPending] = useState(false);

  async function requestCode() {
    setPending(true);
    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { error?: string; code?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Could not send a code.");
        return;
      }
      setCode(data.code ?? CUSTOMER_OTP_CODE);
      setStep("code");
      toast.success(`Use code ${data.code ?? CUSTOMER_OTP_CODE}`);
    } finally {
      setPending(false);
    }
  }

  async function verify() {
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
      router.push(next);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
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
            Email delivery is not wired yet. Use <span className="font-medium text-foreground">123456</span>{" "}
            for every account.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          After you continue, sign in with code <span className="font-medium text-foreground">123456</span>.
        </p>
      )}
      <Button
        type="button"
        className="h-11 w-full"
        disabled={pending || !email}
        onClick={step === "email" ? requestCode : verify}
      >
        {pending ? "Please wait…" : step === "email" ? "Send code" : "Sign in"}
      </Button>
      {step === "code" ? (
        <button
          type="button"
          className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={requestCode}
        >
          Resend code
        </button>
      ) : null}
    </div>
  );
}
