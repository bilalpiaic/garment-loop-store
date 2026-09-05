import Link from "next/link";
import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { getAdminCatalog } from "@/lib/platform";
import { formatPkr } from "@/lib/admin-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  const access = await loadAdminPage("products.manage");
  if (access.forbidden) return <Forbidden />;
  const catalog = await getAdminCatalog();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Catalog</p>
          <h1 className="mt-1 font-serif text-3xl">Products</h1>
        </div>
        <Button render={<Link href="/admin/products/new" />}>New product</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {catalog.products.map((product) => {
              const stock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
              const price = Math.min(...product.variants.map((variant) => variant.salePricePkr ?? variant.pricePkr));
              return (
                <tr key={product.id} className="border-t">
                  <td className="px-4 py-3">
                    <p className="font-medium">{product.title}</p>
                    <p className="text-xs text-muted-foreground">{product.slug}</p>
                  </td>
                  <td className="capitalize">{product.category}</td>
                  <td>{formatPkr(price)}</td>
                  <td>{stock}</td>
                  <td>
                    <Badge variant={product.status === "published" ? "default" : "secondary"}>
                      {product.status ?? "published"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/products/${product.id}`} className="underline underline-offset-4">
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
