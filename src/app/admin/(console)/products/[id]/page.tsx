import { notFound } from "next/navigation";
import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { getAdminCatalog } from "@/lib/platform";
import { ProductEditor } from "@/components/admin/product-editor";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await loadAdminPage("products.manage");
  if (access.forbidden) return <Forbidden />;
  const { id } = await params;
  const catalog = await getAdminCatalog();
  const product = catalog.products.find((item) => item.id === id);
  if (!product) notFound();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Catalog</p>
        <h1 className="mt-1 font-serif text-3xl">{product.title}</h1>
      </div>
      <ProductEditor product={product} categories={catalog.categories} collections={catalog.collections} />
    </div>
  );
}
