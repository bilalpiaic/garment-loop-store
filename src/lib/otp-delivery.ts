export type OtpChannel = "email" | "sms";

export function allowOtpPreview() {
  if (process.env.AUTH_SHOW_OTP === "true") return true;
  if (process.env.AUTH_SHOW_OTP === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export function emailOtpConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function smsOtpConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_FROM_NUMBER?.trim(),
  );
}

export function otpProviderConfigured(channel: OtpChannel) {
  return channel === "email" ? emailOtpConfigured() : smsOtpConfigured();
}

export function missingOtpProviderMessage(channel: OtpChannel) {
  if (channel === "email") {
    return "Email OTP is not configured. Add RESEND_API_KEY and EMAIL_FROM, then see docs/otp-setup.md.";
  }
  return "SMS OTP is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER, then see docs/otp-setup.md.";
}

export async function sendLoginOtp(input: {
  channel: OtpChannel;
  destination: string;
  code: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.channel === "email") {
    return sendEmailOtp(input.destination, input.code);
  }
  return sendSmsOtp(input.destination, input.code);
}

async function sendEmailOtp(to: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: missingOtpProviderMessage("email") };
  }
  const from = process.env.EMAIL_FROM?.trim() || "GarmentLoop <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Your GarmentLoop sign-in code",
      text: `Your GarmentLoop sign-in code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Resend OTP failed", response.status, detail.slice(0, 400));
    return { ok: false, error: "Could not send the email code. Check RESEND_API_KEY and EMAIL_FROM." };
  }
  return { ok: true };
}

async function sendSmsOtp(to: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  if (!sid || !token || !from) {
    return { ok: false, error: missingOtpProviderMessage("sms") };
  }
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: to,
      From: from,
      Body: `GarmentLoop code: ${code}. Expires in 10 minutes.`,
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Twilio OTP failed", response.status, detail.slice(0, 400));
    return { ok: false, error: "Could not send the SMS code. Check Twilio SID, token, and from-number." };
  }
  return { ok: true };
}
