"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "password" | "mfa" | "setup";

export function AdminLoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<Step>("password");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [setupEmail, setSetupEmail] = useState<string | null>(null);

  async function onPassword(formData: FormData) {
    setPending(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? ""),
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        ok?: boolean;
        mfaRequired?: boolean;
        mfaSetupRequired?: boolean;
        challengeId?: string;
        secret?: string;
        otpauthUrl?: string;
        email?: string;
      };
      if (!response.ok) {
        toast.error(data.error ?? "Could not sign in.");
        return;
      }
      if (data.mfaRequired && data.challengeId) {
        setChallengeId(data.challengeId);
        setStep("mfa");
        toast.message("Enter your authenticator code.");
        return;
      }
      if (data.mfaSetupRequired && data.challengeId) {
        setChallengeId(data.challengeId);
        setSecret(data.secret ?? null);
        setOtpauthUrl(data.otpauthUrl ?? null);
        setSetupEmail(data.email ?? null);
        setStep("setup");
        toast.message("Enroll MFA to continue — required for owner/admin.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function onMfa(formData: FormData) {
    setPending(true);
    try {
      const code = String(formData.get("code") ?? "");
      const response = await fetch("/api/admin/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, challengeId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Invalid code.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function onSetup(formData: FormData) {
    setPending(true);
    try {
      const code = String(formData.get("code") ?? "");
      const response = await fetch("/api/admin/mfa/setup-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, challengeId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Could not complete MFA setup.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (step === "mfa") {
    return (
      <form action={onMfa} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Password accepted. Enter the 6-digit code from your authenticator app.
        </p>
        <div className="space-y-2">
          <Label htmlFor="admin-mfa">Authenticator code</Label>
          <Input
            id="admin-mfa"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            className="h-10"
            required
          />
        </div>
        <Button type="submit" className="h-11 w-full" disabled={pending}>
          {pending ? "Verifying…" : "Verify and continue"}
        </Button>
        <button
          type="button"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setStep("password")}
        >
          Back to password
        </button>
      </form>
    );
  }

  if (step === "setup") {
    return (
      <form action={onSetup} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          MFA is required for {setupEmail ?? "owner/admin"}. Add this secret to your authenticator,
          then confirm with a code.
        </p>
        {secret ? (
          <div className="space-y-1 text-sm">
            <p className="font-medium">Secret</p>
            <code className="block break-all rounded-md bg-muted px-3 py-2 text-xs">{secret}</code>
          </div>
        ) : null}
        {otpauthUrl ? (
          <div className="space-y-1 text-sm">
            <p className="font-medium">otpauth URI</p>
            <code className="block break-all rounded-md bg-muted px-3 py-2 text-xs">{otpauthUrl}</code>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="admin-mfa-setup">Authenticator code</Label>
          <Input
            id="admin-mfa-setup"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            className="h-10"
            required
          />
        </div>
        <Button type="submit" className="h-11 w-full" disabled={pending}>
          {pending ? "Enabling…" : "Enable MFA and sign in"}
        </Button>
      </form>
    );
  }

  return (
    <form action={onPassword} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="admin-email">Work email</Label>
        <Input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="owner@garmentloop.store"
          className="h-10"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-password">Password</Label>
        <Input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Your admin password"
          className="h-10"
          required
        />
      </div>
      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in with password"}
      </Button>
    </form>
  );
}
