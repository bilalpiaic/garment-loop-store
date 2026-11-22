import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { getSettings, persistenceInfo } from "@/lib/platform";
import { SettingsForm } from "@/components/admin/admin-forms";
import { emailConfigured, emailMode } from "@/lib/email";
import { stripeConfigured, stripeWebhookConfigured } from "@/lib/stripe";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const access = await loadAdminPage("settings.manage");
  if (access.forbidden) return <Forbidden />;
  const settings = await getSettings();
  const mail = emailMode();
  const persistence = persistenceInfo();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Store</p>
        <h1 className="mt-1 font-serif text-3xl">Settings</h1>
      </div>
      <section className="rounded-xl border bg-card p-5 text-sm">
        <h2 className="font-serif text-2xl">Integrations</h2>
        <ul className="mt-3 space-y-2 text-muted-foreground">
          <li>
            <span className="text-foreground">Data store:</span>{" "}
            {persistence.neon
              ? "Neon Postgres (DATABASE_URL set)."
              : `Demo mode (${persistence.mode}) — no database required. Sample catalog, orders, and discounts are seeded automatically.`}
          </li>
          <li>
            <span className="text-foreground">Email:</span>{" "}
            {emailConfigured()
              ? `Active (${mail}) — order confirmation, shipment, and return notices.`
              : "Mock / console log — set RESEND_API_KEY or SMTP_HOST + SMTP_USER (+ SMTP_PASS)."}
          </li>
          <li>
            <span className="text-foreground">Stripe Checkout:</span>{" "}
            {stripeConfigured()
              ? "Keys present — Card (Stripe) available at checkout."
              : "Inactive — set STRIPE_SECRET_KEY + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (card_demo fallback)."}
          </li>
          <li>
            <span className="text-foreground">Stripe webhooks:</span>{" "}
            {stripeWebhookConfigured()
              ? "STRIPE_WEBHOOK_SECRET set — POST /api/stripe/webhook."
              : "No-op until STRIPE_WEBHOOK_SECRET is set (endpoint still returns 200)."}
          </li>
        </ul>
      </section>
      <SettingsForm settings={settings} />
    </div>
  );
}
