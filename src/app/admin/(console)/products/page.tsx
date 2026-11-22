import Link from "next/link";
import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { getAdminCatalog } from "@/lib/platform";
import { Button } from "@/components/ui/button";
import { ProductBulkTable } from "@/components/admin/admin-crud";

export const metadata = { title: "Products" };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const access = await loadAdminPage("products.manage");
  if (access.forbidden) return <Forbidden />;
  const { status } = await searchParams;
  const catalog = await getAdminCatalog();
  const products = catalog.products
    .filter((product) => (status ? (product.status ?? "published") === status : true))
    .map((product) => ({
      id: product.id,
      title: product.title,
      slug: product.slug,
      category: product.category,
      status: product.status,
      price: Math.min(...product.variants.map((variant) => variant.salePricePkr ?? variant.pricePkr)),
      stock: product.variants.reduce((sum, variant) => sum + variant.stock, 0),
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Catalog</p>
          <h1 className="mt-1 font-serif text-3xl">Products</h1>
        </div>
        <Button nativeButton={false} render={<Link href="/admin/products/new" />}>
          New product
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {["", "published", "draft", "archived"].map((value) => (
          <Link
            key={value || "all"}
            href={value ? `/admin/products?status=${value}` : "/admin/products"}
            className="rounded-full border px-3 py-1 capitalize"
          >
            {value || "All"}
          </Link>
        ))}
      </div>
      <ProductBulkTable products={products} />
    </div>
  );
}
