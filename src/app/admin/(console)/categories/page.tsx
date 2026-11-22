import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { getAdminCatalog } from "@/lib/platform";
import { DeleteTaxonomyButton, TaxonomyForm } from "@/components/admin/admin-forms";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const access = await loadAdminPage("categories.manage");
  if (access.forbidden) return <Forbidden />;
  const catalog = await getAdminCatalog();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Catalog</p>
        <h1 className="mt-1 font-serif text-3xl">Categories</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Create or update categories. Products reference a category slug from the product editor.
        </p>
      </div>
      <TaxonomyForm kind="categories" />
      <div className="space-y-4">
        {catalog.categories.map((category) => (
          <section key={category.slug} className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl">{category.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {category.slug} ·{" "}
                  {catalog.products.filter((product) => product.category === category.slug).length} products
                </p>
              </div>
              <DeleteTaxonomyButton kind="categories" slug={category.slug} />
            </div>
            <TaxonomyForm kind="categories" item={category} />
          </section>
        ))}
      </div>
    </div>
  );
}
