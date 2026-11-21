import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CatalogProvider } from "@/components/catalog-provider";
import { ConsentBanner } from "@/components/consent-banner";
import { getCustomerSession, getPublishedCatalog } from "@/lib/platform";

export const dynamic = "force-dynamic";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [catalog, session] = await Promise.all([getPublishedCatalog(), getCustomerSession()]);
  return (
    <CatalogProvider catalog={catalog}>
      <SiteHeader customerEmail={session?.customer.email} />
      <main className="flex-1">{children}</main>
      <SiteFooter categories={catalog.categories} />
      <ConsentBanner />
    </CatalogProvider>
  );
}
