import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { CsvImportForm } from "@/components/admin/csv-import-form";

export const metadata = { title: "CSV import" };

export default async function AdminProductImportPage() {
  const access = await loadAdminPage("products.manage");
  if (access.forbidden) return <Forbidden />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Catalog</p>
        <h1 className="mt-1 font-serif text-3xl">CSV product import</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Upload or paste a product CSV, validate rows, preview create/update actions, then commit.
          Owner and admin only.
        </p>
      </div>
      <CsvImportForm />
    </div>
  );
}
