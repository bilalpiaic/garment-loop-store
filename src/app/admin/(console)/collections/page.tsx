import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { getAdminCatalog } from "@/lib/platform";
import { DeleteTaxonomyButton, TaxonomyForm } from "@/components/admin/admin-forms";
import { CollectionAssignForm } from "@/components/admin/admin-crud";

export const metadata = { title: "Collections" };

export default async function AdminCollectionsPage() {
  const access = await loadAdminPage("collections.manage");
  if (access.forbidden) return <Forbidden />;
  const catalog = await getAdminCatalog();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Catalog</p>
        <h1 className="mt-1 font-serif text-3xl">Collections</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Create collections, then assign products below. Product editors can also toggle collection membership.
        </p>
      </div>
      <TaxonomyForm kind="collections" />
      <div className="space-y-6">
        {catalog.collections.map((collection) => (
          <section key={collection.slug} className="space-y-3 rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl">{collection.name}</h2>
                <p className="text-xs text-muted-foreground">{collection.slug}</p>
                <p className="mt-1 text-sm text-muted-foreground">{collection.description}</p>
              </div>
              <DeleteTaxonomyButton kind="collections" slug={collection.slug} />
            </div>
            <TaxonomyForm kind="collections" item={collection} />
            <CollectionAssignForm slug={collection.slug} products={catalog.products} />
          </section>
        ))}
      </div>
    </div>
  );
}
