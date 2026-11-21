"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CustomerLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/account";
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string>();
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
      const data = (await response.json()) as { error?: string; devCode?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Could not send a code.");
        return;
      }
      setDevCode(data.devCode);
      setStep("code");
      toast.success(data.devCode ? `Dev code: ${data.devCode}` : "Check your email for a sign-in code.");
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
        body: JSON.stringify({ email, code }),
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
            placeholder="000000"
          />
          {devCode ? (
            <p className="text-xs text-muted-foreground">
              Development mode — use code <span className="font-medium text-foreground">{devCode}</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Enter the 6-digit code we sent to your email.</p>
          )}
        </div>
      ) : null}
      <Button
        type="button"
        className="h-11 w-full"
        disabled={pending || !email}
        onClick={step === "email" ? requestCode : verify}
      >
        {pending ? "Please wait…" : step === "email" ? "Send code" : "Sign in"}
      </Button>
      {step === "code" ? (
        <button type="button" className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={requestCode}>
          Resend code
        </button>
      ) : null}
    </div>
  );
}
