import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { listContentPages, persistenceInfo } from "@/lib/platform";
import { ContentPagesForm } from "@/components/admin/content-pages-form";

export const metadata = { title: "Content" };

export default async function AdminContentPage() {
  const access = await loadAdminPage("products.manage");
  if (access.forbidden) return <Forbidden />;
  const pages = await listContentPages();
  const persistence = persistenceInfo();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Merchandising</p>
        <h1 className="mt-1 font-serif text-3xl">Content pages</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Create and edit About, Sustainability, FAQ, and policy copy used on the storefront.
          Pages persist in{" "}
          {persistence.mysql
            ? "cPanel MySQL (platform_state)"
            : persistence.neon
              ? "Neon Postgres"
              : "the local demo store"}
          .
        </p>
      </div>
      <ContentPagesForm pages={pages} />
    </div>
  );
}
