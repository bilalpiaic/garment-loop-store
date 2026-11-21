import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { listContentPages } from "@/lib/platform";
import { ContentPagesForm } from "@/components/admin/content-pages-form";

export const metadata = { title: "Content" };

export default async function AdminContentPage() {
  const access = await loadAdminPage("products.manage");
  if (access.forbidden) return <Forbidden />;
  const pages = await listContentPages();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Merchandising</p>
        <h1 className="mt-1 font-serif text-3xl">Content pages</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Edit Sustainability and policy copy used on the storefront. No CMS dependency — stored in
          the demo platform state (file/memory or Neon when configured).
        </p>
      </div>
      <ContentPagesForm pages={pages} />
    </div>
  );
}
