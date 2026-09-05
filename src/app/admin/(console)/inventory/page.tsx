import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { listInventory, listMovements } from "@/lib/platform";
import { InventoryAdjust } from "@/components/admin/admin-forms";
import { formatDateTime } from "@/lib/admin-nav";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Inventory" };

export default async function AdminInventoryPage() {
  const access = await loadAdminPage("inventory.manage");
  if (access.forbidden) return <Forbidden />;
  const [items, movements] = await Promise.all([listInventory(), listMovements(20)]);
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Stock</p>
        <h1 className="mt-1 font-serif text-3xl">Inventory</h1>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th>SKU</th>
              <th>Variant</th>
              <th>Stock</th>
              <th>Adjust</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.variantId} className="border-t">
                <td className="px-4 py-3">{item.productTitle}</td>
                <td className="font-mono text-xs">{item.sku}</td>
                <td>
                  {item.color} · {item.size}
                </td>
                <td>
                  {item.stock}{" "}
                  {item.low ? (
                    <Badge variant="destructive" className="ml-1">
                      Low
                    </Badge>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <InventoryAdjust variantId={item.variantId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section>
        <h2 className="mb-3 font-serif text-2xl">Recent movements</h2>
        <ul className="space-y-2 text-sm">
          {movements.map((movement) => (
            <li key={movement.id} className="rounded-lg border bg-card px-4 py-2">
              <span className={movement.change < 0 ? "text-destructive" : "text-foreground"}>
                {movement.change > 0 ? "+" : ""}
                {movement.change}
              </span>{" "}
              {movement.variantId} · {movement.type}
              {movement.relatedOrderNumber ? ` · ${movement.relatedOrderNumber}` : ""}
              <span className="block text-xs text-muted-foreground">{formatDateTime(movement.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
