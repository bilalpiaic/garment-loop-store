import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { getAdminCatalog } from "@/lib/platform";
import { ProductEditor } from "@/components/admin/product-editor";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const access = await loadAdminPage("products.manage");
  if (access.forbidden) return <Forbidden />;
  const catalog = await getAdminCatalog();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Catalog</p>
        <h1 className="mt-1 font-serif text-3xl">New product</h1>
      </div>
      <ProductEditor categories={catalog.categories} collections={catalog.collections} />
    </div>
  );
}
