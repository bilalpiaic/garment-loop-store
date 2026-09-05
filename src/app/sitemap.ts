import type { MetadataRoute } from "next";
import { categories, collections, products } from "@/lib/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = ["", "/shop", "/about", "/faq", "/contact", "/search", "/cart", "/checkout"];
  const productPaths = products.map((product) => `/product/${product.slug}`);
  const categoryPaths = categories.map((category) => `/category/${category.slug}`);
  const collectionPaths = collections.map((collection) => `/collection/${collection.slug}`);

  return [...staticPaths, ...productPaths, ...categoryPaths, ...collectionPaths].map((path) => ({
    url: `https://garmentloop.store${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));
}
