"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Status = {
  mfaEnabled: boolean;
  mfaEnabledAt?: string;
  policyRequired: boolean;
  role: string;
};

export function MfaSecurityPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [pending, setPending] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");

  async function loadStatus() {
    const response = await fetch("/api/admin/mfa");
    const data = (await response.json()) as Status & { error?: string };
    if (!response.ok) {
      toast.error(data.error ?? "Could not load MFA status.");
      return;
    }
    setStatus(data);
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function begin() {
    setPending(true);
    try {
      const response = await fetch("/api/admin/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "begin" }),
      });
      const data = (await response.json()) as {
        error?: string;
        challengeId?: string;
        secret?: string;
        otpauthUrl?: string;
      };
      if (!response.ok) {
        toast.error(data.error ?? "Could not start enrollment.");
        return;
      }
      setChallengeId(data.challengeId ?? null);
      setSecret(data.secret ?? null);
      setOtpauthUrl(data.otpauthUrl ?? null);
      setCode("");
      toast.success("Scan the otpauth URI or enter the secret in your authenticator.");
    } finally {
      setPending(false);
    }
  }

  async function confirm() {
    if (!challengeId) return;
    setPending(true);
    try {
      const response = await fetch("/api/admin/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", challengeId, code }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Could not confirm MFA.");
        return;
      }
      toast.success("Authenticator enrolled.");
      setChallengeId(null);
      setSecret(null);
      setOtpauthUrl(null);
      setCode("");
      await loadStatus();
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    setPending(true);
    try {
      const response = await fetch("/api/admin/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable", code }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Could not disable MFA.");
        return;
      }
      toast.success("MFA disabled.");
      setCode("");
      await loadStatus();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-serif text-2xl">Authenticator (TOTP)</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Owner and admin can enroll an authenticator app. Staff may enroll optionally. When{" "}
          <code>ADMIN_MFA_REQUIRED=1</code>, owner/admin must complete TOTP at login (and enroll on
          first sign-in if needed).
        </p>
        {status ? (
          <ul className="mt-4 space-y-1 text-sm">
            <li>
              <span className="text-muted-foreground">Status:</span>{" "}
              {status.mfaEnabled ? "Enabled" : "Not enrolled"}
            </li>
            <li>
              <span className="text-muted-foreground">Policy:</span>{" "}
              {status.policyRequired ? "Required for your role" : "Optional for your role"}
            </li>
            {status.mfaEnabledAt ? (
              <li>
                <span className="text-muted-foreground">Enrolled:</span> {status.mfaEnabledAt}
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        )}
      </section>

      {status && !status.mfaEnabled ? (
        <section className="space-y-4 rounded-xl border bg-card p-5">
          <h3 className="font-serif text-xl">Enroll</h3>
          {!challengeId ? (
            <Button type="button" onClick={begin} disabled={pending}>
              Generate authenticator secret
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1 text-sm">
                <p className="font-medium">Secret</p>
                <code className="block break-all rounded-md bg-muted px-3 py-2 text-xs">{secret}</code>
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-medium">otpauth URI</p>
                <code className="block break-all rounded-md bg-muted px-3 py-2 text-xs">
                  {otpauthUrl}
                </code>
              </div>
              <div className="max-w-xs space-y-2">
                <Label htmlFor="mfa-code">Confirm with 6-digit code</Label>
                <Input
                  id="mfa-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="123456"
                />
              </div>
              <Button type="button" onClick={confirm} disabled={pending || code.length !== 6}>
                Confirm enrollment
              </Button>
            </div>
          )}
        </section>
      ) : null}

      {status?.mfaEnabled ? (
        <section className="space-y-4 rounded-xl border bg-card p-5">
          <h3 className="font-serif text-xl">Disable MFA</h3>
          <p className="text-sm text-muted-foreground">
            Enter a current authenticator code. Disabled when policy requires MFA for owner/admin.
          </p>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="mfa-disable">Authenticator code</Label>
            <Input
              id="mfa-disable"
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="123456"
            />
          </div>
          <Button type="button" variant="outline" onClick={disable} disabled={pending || code.length !== 6}>
            Disable MFA
          </Button>
        </section>
      ) : null}
    </div>
  );
}
