import type { MetadataRoute } from "next";
import { getPublishedCatalog, listContentPages } from "@/lib/platform";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [catalog, pages] = await Promise.all([getPublishedCatalog(), listContentPages()]);

  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/shop"), changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/search"), changeFrequency: "weekly", priority: 0.5 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/faq"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/contact"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/sustainability"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/circular"), changeFrequency: "weekly", priority: 0.6 },
    { url: absoluteUrl("/circular/take-back"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/circular/repair"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/circular/subscribe"), changeFrequency: "monthly", priority: 0.5 },
  ];

  for (const product of catalog.products) {
    if (product.status && product.status !== "published") continue;
    entries.push({
      url: absoluteUrl(`/product/${product.slug}`),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  for (const category of catalog.categories) {
    entries.push({
      url: absoluteUrl(`/category/${category.slug}`),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  for (const collection of catalog.collections) {
    entries.push({
      url: absoluteUrl(`/collection/${collection.slug}`),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  const reserved = new Set([
    "about",
    "faq",
    "contact",
    "sustainability",
    "shop",
    "search",
    "circular",
  ]);
  for (const page of pages) {
    if (reserved.has(page.slug)) continue;
    entries.push({
      url: absoluteUrl(`/policies/${page.slug}`),
      lastModified: page.updatedAt ? new Date(page.updatedAt) : undefined,
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  return entries;
}
