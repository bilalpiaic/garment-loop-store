import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { getSettings, persistenceInfo } from "@/lib/platform";
import { SettingsForm } from "@/components/admin/admin-forms";
import { emailConfigured, emailMode } from "@/lib/email";
import { easypostConfigured, easypostFromAddress } from "@/lib/easypost";
import { taxProviderConfigured, taxProviderName } from "@/lib/tax";
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
            {persistence.mysql
              ? "MySQL / MariaDB (cPanel DATABASE_URL or MYSQL_* set)."
              : persistence.neon
                ? "Neon Postgres (DATABASE_URL set)."
                : `Demo mode (${persistence.mode}) — no database required. Sample catalog, orders, and discounts are seeded automatically.`}
          </li>
          <li>
            <span className="text-foreground">Email:</span>{" "}
            {emailConfigured()
              ? `Active (${mail}) — order confirmation, shipment, return notices, and customer login OTP.`
              : "Mock / console log — set RESEND_API_KEY or SMTP_HOST + SMTP_USER (+ SMTP_PASS) for real delivery (including login OTP)."}
          </li>
          <li>
            <span className="text-foreground">Stripe Checkout:</span>{" "}
            {stripeConfigured()
              ? "Keys present — Payment Element + Express Checkout (cards, wallets, BNPL when Dashboard allows)."
              : "Inactive — set STRIPE_SECRET_KEY + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (card_demo fallback)."}
          </li>
          <li>
            <span className="text-foreground">Stripe webhooks:</span>{" "}
            {stripeWebhookConfigured()
              ? "STRIPE_WEBHOOK_SECRET set — POST /api/stripe/webhook."
              : "No-op until STRIPE_WEBHOOK_SECRET is set (endpoint still returns 200)."}
          </li>
          <li>
            <span className="text-foreground">EasyPost shipping:</span>{" "}
            {easypostConfigured() && easypostFromAddress()
              ? "Live carrier rates at checkout (EASYPOST_API_KEY + EASYPOST_FROM_*)."
              : easypostConfigured()
                ? "API key set — add EASYPOST_FROM_NAME/STREET1/CITY/STATE/ZIP/COUNTRY for live rates (zone fallback until then)."
                : "Zone rates only — set EASYPOST_API_KEY + ship-from address for live carriers. Label buy / prepaid RMA is stubbed."}
          </li>
          <li>
            <span className="text-foreground">Tax engine:</span>{" "}
            {taxProviderConfigured()
              ? `Remote quotes via ${taxProviderName()} (with local PK/GCC/intl fallback).`
              : "Local region rules (PK 5% sales tax, GCC 5% VAT est., intl duties at destination). Set AVALARA_* or TAXJAR_API_KEY for live quotes."}
          </li>
        </ul>
      </section>
      <SettingsForm settings={settings} />
    </div>
  );
}
