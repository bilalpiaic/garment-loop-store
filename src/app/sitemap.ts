import type { MetadataRoute } from "next";
import { getPublishedCatalog } from "@/lib/platform";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await getPublishedCatalog();
  const staticPaths = ["", "/shop", "/about", "/faq", "/contact", "/search", "/cart", "/checkout"];
  const productPaths = catalog.products.map((product) => `/product/${product.slug}`);
  const categoryPaths = catalog.categories.map((category) => `/category/${category.slug}`);
  const collectionPaths = catalog.collections.map((collection) => `/collection/${collection.slug}`);

  return [...staticPaths, ...productPaths, ...categoryPaths, ...collectionPaths].map((path) => ({
    url: `https://garmentloop.store${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));
}
