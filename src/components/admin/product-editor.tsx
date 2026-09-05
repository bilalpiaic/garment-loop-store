"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Category, Collection, Product, ProductStatus, ProductVariant } from "@/lib/catalog";
import { slugify } from "@/lib/slug";

function emptyVariant(productId: string): ProductVariant {
  return {
    id: `${productId}-${crypto.randomUUID().slice(0, 8)}`,
    sku: "",
    color: "Black",
    colorHex: "#111111",
    size: "M",
    pricePkr: 8900,
    stock: 10,
  };
}

export function ProductEditor({
  product,
  categories,
  collections,
}: {
  product?: Product;
  categories: Category[];
  collections: Collection[];
}) {
  const router = useRouter();
  const [productId] = useState(() => product?.id ?? `prd-${crypto.randomUUID().slice(0, 8)}`);
  const [title, setTitle] = useState(product?.title ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [subtitle, setSubtitle] = useState(product?.subtitle ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [category, setCategory] = useState(product?.category ?? categories[0]?.slug ?? "");
  const [selectedCollections, setSelectedCollections] = useState<string[]>(product?.collections ?? []);
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? "published");
  const [featured, setFeatured] = useState(Boolean(product?.featured));
  const [isNew, setIsNew] = useState(Boolean(product?.isNew));
  const [featuresText, setFeaturesText] = useState((product?.features ?? []).join("\n"));
  const [specsText, setSpecsText] = useState(
    (product?.specs ?? []).map((spec) => `${spec.label}: ${spec.value}`).join("\n"),
  );
  const [imagesText, setImagesText] = useState(
    (product?.images ?? []).map((image) => `${image.src} | ${image.alt}`).join("\n"),
  );
  const [variants, setVariants] = useState<ProductVariant[]>(
    product?.variants?.length ? product.variants : [emptyVariant(productId)],
  );
  const [pending, setPending] = useState(false);

  const payload = useMemo<Product>(
    () => ({
      id: product?.id ?? (slug || slugify(title) || productId),
      slug: slug || slugify(title),
      title,
      subtitle,
      description,
      category,
      collections: selectedCollections,
      featured,
      isNew,
      status,
      features: featuresText.split("\n").map((line) => line.trim()).filter(Boolean),
      specs: specsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [label, ...rest] = line.split(":");
          return { label: (label ?? "").trim(), value: rest.join(":").trim() };
        }),
      images: imagesText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [src, alt] = line.split("|").map((part) => part.trim());
          return { src: src ?? "", alt: alt || title };
        }),
      variants: variants.map((variant) => ({
        ...variant,
        id: variant.id || `${productId}-${slugify(variant.color)}-${slugify(variant.size)}`,
        sku: variant.sku || `${productId}-${variant.color}-${variant.size}`.toUpperCase(),
      })),
    }),
    [
      product?.id,
      slug,
      title,
      subtitle,
      description,
      category,
      selectedCollections,
      featured,
      isNew,
      status,
      featuresText,
      specsText,
      imagesText,
      variants,
      productId,
    ],
  );

  async function save() {
    setPending(true);
    try {
      const url = product ? `/api/admin/products/${product.id}` : "/api/admin/products";
      const response = await fetch(url, {
        method: product ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string; product?: Product };
      if (!response.ok) {
        toast.error(data.error ?? "Could not save product.");
        return;
      }
      toast.success("Product saved.");
      router.push("/admin/products");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title">
          <Input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!product) setSlug(slugify(event.target.value));
            }}
            className="h-10"
          />
        </Field>
        <Field label="Slug">
          <Input value={slug} onChange={(event) => setSlug(event.target.value)} className="h-10" />
        </Field>
        <Field label="Subtitle">
          <Input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} className="h-10" />
        </Field>
        <Field label="Category">
          <select
            className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Description">
        <Textarea rows={5} value={description} onChange={(event) => setDescription(event.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />
          Featured
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isNew} onChange={(event) => setIsNew(event.target.checked)} />
          New arrival
        </label>
        <label className="flex items-center gap-2">
          Status
          <select
            className="h-9 rounded-md border px-2"
            value={status}
            onChange={(event) => setStatus(event.target.value as ProductStatus)}
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Collections</p>
        <div className="flex flex-wrap gap-3 text-sm">
          {collections.map((item) => (
            <label key={item.slug} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedCollections.includes(item.slug)}
                onChange={(event) => {
                  setSelectedCollections((current) =>
                    event.target.checked
                      ? [...current, item.slug]
                      : current.filter((slugValue) => slugValue !== item.slug),
                  );
                }}
              />
              {item.name}
            </label>
          ))}
        </div>
      </div>
      <Field label="Features (one per line)">
        <Textarea rows={4} value={featuresText} onChange={(event) => setFeaturesText(event.target.value)} />
      </Field>
      <Field label="Specifications (Label: value)">
        <Textarea rows={4} value={specsText} onChange={(event) => setSpecsText(event.target.value)} />
      </Field>
      <Field label="Images (URL | alt text)">
        <Textarea rows={4} value={imagesText} onChange={(event) => setImagesText(event.target.value)} />
      </Field>
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">Variants</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVariants((current) => [...current, emptyVariant(productId)])}
          >
            Add variant
          </Button>
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Color</th>
                <th className="px-3 py-2">Hex</th>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Sale</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {variants.map((variant, index) => (
                <tr key={variant.id} className="border-t">
                  <td className="px-2 py-2">
                    <Input
                      value={variant.color}
                      onChange={(event) =>
                        setVariants((current) =>
                          current.map((item, i) => (i === index ? { ...item, color: event.target.value } : item)),
                        )
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      value={variant.colorHex}
                      onChange={(event) =>
                        setVariants((current) =>
                          current.map((item, i) => (i === index ? { ...item, colorHex: event.target.value } : item)),
                        )
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      value={variant.size}
                      onChange={(event) =>
                        setVariants((current) =>
                          current.map((item, i) => (i === index ? { ...item, size: event.target.value } : item)),
                        )
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      value={variant.sku}
                      onChange={(event) =>
                        setVariants((current) =>
                          current.map((item, i) => (i === index ? { ...item, sku: event.target.value } : item)),
                        )
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      value={variant.pricePkr}
                      onChange={(event) =>
                        setVariants((current) =>
                          current.map((item, i) =>
                            i === index ? { ...item, pricePkr: Number(event.target.value) } : item,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      value={variant.salePricePkr ?? ""}
                      onChange={(event) =>
                        setVariants((current) =>
                          current.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  salePricePkr: event.target.value ? Number(event.target.value) : undefined,
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      value={variant.stock}
                      onChange={(event) =>
                        setVariants((current) =>
                          current.map((item, i) =>
                            i === index ? { ...item, stock: Number(event.target.value) } : item,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      className="text-xs text-destructive"
                      onClick={() => setVariants((current) => current.filter((_, i) => i !== index))}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Button type="button" className="h-11 px-6" disabled={pending} onClick={save}>
        {pending ? "Saving…" : "Save product"}
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
