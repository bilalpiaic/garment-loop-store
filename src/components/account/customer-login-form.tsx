"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseLoginIdentifier } from "@/lib/login-identifier";
import { customerPostLoginPath } from "@/lib/auth-redirect";

export function CustomerLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"credentials" | "code">("credentials");
  const [pending, setPending] = useState(false);
  const [identifierError, setIdentifierError] = useState<string>();
  const [otpHint, setOtpHint] = useState<string>();
  const [otpPreview, setOtpPreview] = useState<string>();

  async function submitCredentials(event?: FormEvent) {
    event?.preventDefault();
    const parsed = parseLoginIdentifier(identifier);
    if (!parsed.ok) {
      setIdentifierError(parsed.error);
      toast.error(parsed.error);
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setIdentifierError(undefined);
    setPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = (await response.json()) as {
        error?: string;
        kind?: "admin" | "otp";
        channel?: "email" | "sms";
        destinationLabel?: string;
        delivered?: boolean;
        otpPreview?: string;
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
      const via = data.channel === "sms" ? "SMS" : "email";
      const destination = data.destinationLabel ?? (parsed.value.kind === "phone" ? parsed.value.phone : parsed.value.email);
      setOtpHint(
        data.delivered
          ? `We sent a ${via} code to ${destination}.`
          : `Delivery is not configured yet, so the preview code is shown below. Add Resend or Twilio keys to send a real ${via} code.`,
      );
      setOtpPreview(data.otpPreview);
      setCode(data.otpPreview ?? "");
      setStep("code");
      toast.success(data.otpPreview ? `Preview code ${data.otpPreview}` : `Code sent by ${via}.`);
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
        body: JSON.stringify({ identifier, code }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "That code did not work.");
        return;
      }
      router.push(customerPostLoginPath(next));
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={step === "credentials" ? submitCredentials : verify} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="identifier">Email or mobile number</Label>
        <Input
          id="identifier"
          type="text"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={identifier}
          onChange={(event) => {
            setIdentifier(event.target.value);
            setIdentifierError(undefined);
          }}
          className="h-10"
          autoComplete="username"
          aria-invalid={Boolean(identifierError)}
        />
        {identifierError ? <p className="text-xs text-destructive">{identifierError}</p> : null}
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
        <p className="text-xs text-muted-foreground">At least 8 characters. New accounts are created after the OTP.</p>
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
            placeholder="6-digit code"
            autoComplete="one-time-code"
          />
          <p className="text-xs text-muted-foreground">
            {otpHint ?? "Enter the 6-digit code sent to you."}
            {otpPreview ? (
              <>
                {" "}
                Preview code: <span className="font-medium text-foreground">{otpPreview}</span>
              </>
            ) : null}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Email receives a Resend OTP. A Pakistani mobile number (03xx or +92) receives SMS via Twilio. Owner,
          admin, and staff emails skip this step and open the console.
        </p>
      )}
      <Button
        type="submit"
        className="h-11 w-full"
        disabled={pending || !identifier || !password}
        onClick={(event) => {
          event.preventDefault();
          if (step === "credentials") void submitCredentials();
          else void verify();
        }}
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
