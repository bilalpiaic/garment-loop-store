import nodemailer from "nodemailer";
import type { Order } from "@/lib/order-model";
import type { ReturnRequest } from "@/lib/commerce-types";
import { formatMoney } from "@/lib/money";
import { site } from "@/lib/site";

export type EmailMode = "resend" | "smtp" | "mock";

export type EmailResult = {
  ok: boolean;
  mode: EmailMode;
  id?: string;
  error?: string;
};

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY) || Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
}

export function emailMode(): EmailMode {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST && process.env.SMTP_USER) return "smtp";
  return "mock";
}

function fromAddress() {
  return process.env.EMAIL_FROM ?? `GarmentLoop <orders@${site.url.replace(/^https?:\/\//, "").replace(/\/$/, "") || "garmentloop.store"}>`;
}

async function sendRaw(input: { to: string; subject: string; html: string; text: string }): Promise<EmailResult> {
  const mode = emailMode();
  if (mode === "resend") {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress(),
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });
      const data = (await response.json()) as {
        id?: string;
        message?: string;
        name?: string;
        statusCode?: number;
      };
      if (!response.ok) {
        console.error("[email:resend]", data);
        return {
          ok: false,
          mode,
          error: data.message ?? `Resend failed (${response.status})`,
        };
      }
      return { ok: true, mode, id: data.id };
    } catch (error) {
      console.error("[email:resend]", error);
      return { ok: false, mode, error: error instanceof Error ? error.message : "Resend error" };
    }
  }

  if (mode === "smtp") {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "1",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      const info = await transporter.sendMail({
        from: fromAddress(),
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      return { ok: true, mode, id: String(info.messageId ?? "") };
    } catch (error) {
      console.error("[email:smtp]", error);
      return { ok: false, mode, error: error instanceof Error ? error.message : "SMTP error" };
    }
  }

  console.info("[email:mock]", {
    to: input.to,
    subject: input.subject,
    preview: input.text.slice(0, 240),
  });
  return { ok: true, mode: "mock", id: `mock-${Date.now()}` };
}

function orderLinesHtml(order: Order) {
  return order.items
    .map(
      (item) =>
        `<tr><td style="padding:6px 0">${item.productTitle} (${item.color} / ${item.size}) ×${item.quantity}</td><td style="text-align:right">${formatMoney(item.totalPkr, order.currency)}</td></tr>`,
    )
    .join("");
}

function orderLinesText(order: Order) {
  return order.items
    .map((item) => `- ${item.productTitle} (${item.color}/${item.size}) ×${item.quantity}: ${formatMoney(item.totalPkr, order.currency)}`)
    .join("\n");
}

export function orderConfirmationEmail(order: Order) {
  const subject = `GarmentLoop order ${order.orderNumber} confirmed`;
  const text = [
    `Thank you, ${order.customer.fullName}.`,
    `Order ${order.orderNumber} is ${order.status} (payment: ${order.paymentStatus}).`,
    orderLinesText(order),
    `Shipping: ${order.shippingLabel ?? "Standard"} — ${formatMoney(order.shippingPkr, order.currency)}`,
    order.taxPkr ? `Tax: ${formatMoney(order.taxPkr, order.currency)}` : undefined,
    `Total: ${formatMoney(order.totalPkr, order.currency)}`,
    `Ship to: ${order.customer.address}, ${order.customer.area}, ${order.customer.city}, ${order.customer.country}`,
  ]
    .filter(Boolean)
    .join("\n");
  const html = `
    <div style="font-family:Georgia,serif;color:#333;max-width:560px">
      <p style="letter-spacing:.2em;text-transform:uppercase;font-size:11px;color:#7d8b6b">GarmentLoop</p>
      <h1 style="font-weight:normal;font-size:28px">Thank you, ${escapeHtml(order.customer.fullName.split(" ")[0] ?? "")}.</h1>
      <p>Order <strong>${escapeHtml(order.orderNumber)}</strong> is ${escapeHtml(order.status)} · payment ${escapeHtml(order.paymentStatus)}.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">${orderLinesHtml(order)}</table>
      <p>Total <strong>${escapeHtml(formatMoney(order.totalPkr, order.currency))}</strong></p>
      <p style="color:#5c6358;font-size:14px">We will follow up on WhatsApp if needed. Questions? ${escapeHtml(site.email)}</p>
    </div>
  `;
  return { subject, text, html };
}

export function shipmentEmail(order: Order) {
  const subject = `GarmentLoop order ${order.orderNumber} is on its way`;
  const tracking = order.trackingNumber
    ? `Tracking: ${order.courier ? `${order.courier} ` : ""}${order.trackingNumber}`
    : "Tracking details will follow shortly.";
  const text = [
    `Good news — order ${order.orderNumber} has shipped.`,
    tracking,
    orderLinesText(order),
  ].join("\n");
  const html = `
    <div style="font-family:Georgia,serif;color:#333;max-width:560px">
      <p style="letter-spacing:.2em;text-transform:uppercase;font-size:11px;color:#7d8b6b">GarmentLoop</p>
      <h1 style="font-weight:normal;font-size:28px">Your order is on its way.</h1>
      <p>Order <strong>${escapeHtml(order.orderNumber)}</strong> is marked shipped.</p>
      <p>${escapeHtml(tracking)}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">${orderLinesHtml(order)}</table>
    </div>
  `;
  return { subject, text, html };
}

export function returnRequestEmail(ret: ReturnRequest) {
  const subject = `GarmentLoop return request ${ret.id} received`;
  const lines = ret.items.map((item) => `- ${item.productTitle} ×${item.quantity}`).join("\n");
  const text = [
    `We received your return request for order ${ret.orderNumber}.`,
    `Reference: ${ret.id}`,
    `Reason: ${ret.reason}`,
    lines,
    "Our atelier team will review and email you next steps.",
  ].join("\n");
  const html = `
    <div style="font-family:Georgia,serif;color:#333;max-width:560px">
      <p style="letter-spacing:.2em;text-transform:uppercase;font-size:11px;color:#7d8b6b">GarmentLoop</p>
      <h1 style="font-weight:normal;font-size:28px">Return request received</h1>
      <p>Order <strong>${escapeHtml(ret.orderNumber)}</strong> · RMA <strong>${escapeHtml(ret.id)}</strong></p>
      <p>${escapeHtml(ret.reason)}</p>
      <ul>${ret.items.map((item) => `<li>${escapeHtml(item.productTitle)} ×${item.quantity}</li>`).join("")}</ul>
      <p style="color:#5c6358;font-size:14px">We will update you once the request is reviewed.</p>
    </div>
  `;
  return { subject, text, html };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendOrderConfirmation(order: Order) {
  const content = orderConfirmationEmail(order);
  return sendRaw({ to: order.customer.email, ...content });
}

export async function sendShipmentNotice(order: Order) {
  const content = shipmentEmail(order);
  return sendRaw({ to: order.customer.email, ...content });
}

export function loginOtpEmail(input: { code: string; expiresMinutes: number }) {
  const subject = "Your GarmentLoop sign-in code";
  const text = [
    "Your GarmentLoop sign-in code is:",
    "",
    input.code,
    "",
    `This code expires in ${input.expiresMinutes} minutes.`,
    "If you did not request this, you can ignore this email.",
    "",
    `— ${site.name}`,
  ].join("\n");
  const html = `
    <div style="font-family:Georgia,serif;color:#333;max-width:560px">
      <p style="letter-spacing:.2em;text-transform:uppercase;font-size:11px;color:#7d8b6b">GarmentLoop</p>
      <h1 style="font-weight:normal;font-size:28px">Your sign-in code</h1>
      <p style="font-size:32px;letter-spacing:.35em;font-weight:bold;margin:24px 0">${escapeHtml(input.code)}</p>
      <p style="color:#5c6358;font-size:14px">Expires in ${input.expiresMinutes} minutes. If you did not request this, ignore this email.</p>
    </div>
  `;
  return { subject, text, html };
}

export async function sendLoginOtpEmail(to: string, code: string, expiresMinutes = 10) {
  const content = loginOtpEmail({ code, expiresMinutes });
  return sendRaw({ to, ...content });
}

/**
 * Map provider errors to a short, safe client message (no secrets).
 * Detects Resend's onboarding/test-sender recipient restriction.
 */
export function publicEmailError(result: EmailResult): string | undefined {
  if (result.ok || !result.error) return undefined;
  const raw = result.error.trim();
  if (!raw) return "Email delivery failed. Try again or contact support.";

  const lower = raw.toLowerCase();
  if (
    lower.includes("only send testing emails to your own email") ||
    (lower.includes("verify a domain") && lower.includes("from"))
  ) {
    return (
      "Sign-in codes can only be emailed to the Resend account owner while EMAIL_FROM uses " +
      "onboarding@resend.dev. Request a code with that account email, or verify your domain at " +
      "resend.com/domains and set EMAIL_FROM to an address on that domain " +
      "(for example GarmentLoop <orders@garmentloop.store>)."
    );
  }

  // Pass through short provider messages that don't look like secrets.
  if (
    raw.length <= 220 &&
    !/re_[A-Za-z0-9]|api[_-]?key|Bearer\s|npg_|sk_live|sk_test/i.test(raw)
  ) {
    return raw;
  }

  return "Email delivery failed. Try again or contact support.";
}

export async function sendReturnRequestNotice(ret: ReturnRequest) {
  const content = returnRequestEmail(ret);
  return sendRaw({ to: ret.customerEmail, ...content });
}
