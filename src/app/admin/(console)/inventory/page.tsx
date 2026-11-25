import Link from "next/link";
import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { getSettings, listInventory, listMovements } from "@/lib/platform";
import { DEFAULT_WAREHOUSES } from "@/lib/identity";
import { InventoryAdjust } from "@/components/admin/admin-forms";
import { formatDateTime } from "@/lib/admin-nav";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Inventory" };

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ low?: string }>;
}) {
  const access = await loadAdminPage("inventory.manage");
  if (access.forbidden) return <Forbidden />;
  const { low } = await searchParams;
  const [allItems, movements, settings] = await Promise.all([
    listInventory(),
    listMovements(40),
    getSettings(),
  ]);
  const warehouses = settings.warehouses?.length ? settings.warehouses : DEFAULT_WAREHOUSES;
  const primaryId = warehouses[0]?.id;
  const warehouseName = (id?: string) =>
    warehouses.find((warehouse) => warehouse.id === id)?.name ?? id;
  const items = low === "1" ? allItems.filter((item) => item.low) : allItems;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Stock</p>
          <h1 className="mt-1 font-serif text-3xl">Inventory</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Stock totals stay aggregate. Warehouse on adjust is cosmetic for multi-location demo
            (no per-warehouse balances or 3PL sync).
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/admin/inventory" className="rounded-full border px-3 py-1">
            All
          </Link>
          <Link href="/admin/inventory?low=1" className="rounded-full border px-3 py-1">
            Low stock
          </Link>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[820px] text-left text-sm">
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
                  <InventoryAdjust
                    variantId={item.variantId}
                    warehouses={warehouses}
                    defaultWarehouseId={primaryId}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">No SKUs match this filter.</p>
        ) : null}
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
              {movement.warehouseId ? ` · ${warehouseName(movement.warehouseId)}` : ""}
              {movement.reason ? ` · ${movement.reason}` : ""}
              {movement.relatedOrderNumber ? ` · ${movement.relatedOrderNumber}` : ""}
              <span className="block text-xs text-muted-foreground">{formatDateTime(movement.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
