import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { listDiscounts } from "@/lib/platform";
import { DiscountForm } from "@/components/admin/admin-forms";
import { DiscountRowActions } from "@/components/admin/admin-crud";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Discounts" };

export default async function AdminDiscountsPage() {
  const access = await loadAdminPage("discounts.manage");
  if (access.forbidden) return <Forbidden />;
  const discounts = await listDiscounts();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Promotions</p>
        <h1 className="mt-1 font-serif text-3xl">Discounts</h1>
        <p className="mt-2 text-sm text-muted-foreground">Create, edit, or delete coupons used at checkout.</p>
      </div>
      <DiscountForm />
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th>Type</th>
              <th>Value</th>
              <th>Used</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {discounts.map((discount) => (
              <tr key={discount.id} className="border-t align-top">
                <td className="px-4 py-3 font-medium">{discount.code}</td>
                <td className="capitalize">{discount.type}</td>
                <td>{discount.type === "percentage" ? `${discount.value}%` : discount.value}</td>
                <td>
                  {discount.usedCount}
                  {discount.usageLimit ? ` / ${discount.usageLimit}` : ""}
                </td>
                <td>
                  <Badge variant={discount.active ? "default" : "secondary"}>
                    {discount.active ? "Active" : "Off"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <DiscountRowActions discount={discount} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
