import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CatalogProvider } from "@/components/catalog-provider";
import { ConsentBanner } from "@/components/consent-banner";
import { NewsletterInvite } from "@/components/newsletter-invite";
import { StorefrontAnalytics } from "@/components/analytics/storefront-analytics";
import { WebVitalsReporter } from "@/components/web-vitals-reporter";
import { getCustomerSession, getPublishedCatalog } from "@/lib/platform";

export const dynamic = "force-dynamic";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [catalog, session] = await Promise.all([getPublishedCatalog(), getCustomerSession()]);
  return (
    <CatalogProvider catalog={catalog}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>
      <SiteHeader customerEmail={session?.customer.email} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter categories={catalog.categories} />
      <ConsentBanner />
      <NewsletterInvite />
      <StorefrontAnalytics />
      <WebVitalsReporter />
    </CatalogProvider>
  );
}
