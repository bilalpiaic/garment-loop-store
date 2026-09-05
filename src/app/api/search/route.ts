import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/catalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const results = searchProducts(q).map((product) => ({
    slug: product.slug,
    title: product.title,
    subtitle: product.subtitle,
    image: product.images[0]?.src,
    pricePkr: product.variants[0]?.salePricePkr ?? product.variants[0]?.pricePkr,
  }));
  return NextResponse.json({ query: q, results });
}
