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
      </div>
      <TaxonomyForm kind="categories" />
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th>Slug</th>
              <th>Products</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {catalog.categories.map((category) => (
              <tr key={category.slug} className="border-t">
                <td className="px-4 py-3 font-medium">{category.name}</td>
                <td>{category.slug}</td>
                <td>{catalog.products.filter((product) => product.category === category.slug).length}</td>
                <td className="px-4 py-3 text-right">
                  <DeleteTaxonomyButton kind="categories" slug={category.slug} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
