import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProductGallery } from "@/components/product-gallery";
import { ProductForm } from "@/components/product-form";
import { ProductGrid } from "@/components/product-card";
import { ProductReviews } from "@/components/product-reviews";
import { ProductQa } from "@/components/product-qa";
import { ViewItemTracker } from "@/components/analytics/view-item-tracker";
import { JsonLd } from "@/components/json-ld";
import { getProductBySlug, relatedProducts } from "@/lib/catalog";
import { getPublishedCatalog, listApprovedQuestions, listApprovedReviews } from "@/lib/platform";
import { site } from "@/lib/site";
import { absoluteUrl, breadcrumbJsonLd, pageMeta } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await getPublishedCatalog();
  const product = getProductBySlug(slug, catalog.products);
  if (!product) return { title: "Product" };
  return pageMeta({
    title: product.title,
    description: product.description,
    path: `/product/${product.slug}`,
    images: product.images[0] ? [product.images[0].src] : undefined,
  });
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getPublishedCatalog();
  const product = getProductBySlug(slug, catalog.products);
  if (!product) notFound();
  const related = relatedProducts(product, 4, catalog.products);
  const [reviews, questions] = await Promise.all([
    listApprovedReviews(product.id),
    listApprovedQuestions(product.id),
  ]);
  const avg =
    reviews.length === 0
      ? undefined
      : reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  const productUrl = absoluteUrl(`/product/${product.slug}`);
  const lowPrice = Math.min(...product.variants.map((v) => v.salePricePkr ?? v.pricePkr));
  const highPrice = Math.max(...product.variants.map((v) => v.pricePkr));
  const inStock = product.variants.some((v) => v.stock > 0);
  const firstSku = product.variants[0]?.sku;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: product.images.map((image) => image.src),
    url: productUrl,
    sku: firstSku,
    brand: { "@type": "Brand", name: site.name },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "PKR",
      lowPrice,
      highPrice,
      url: productUrl,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      offerCount: product.variants.length,
    },
    ...(avg
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(avg.toFixed(1)),
            reviewCount: reviews.length,
          },
        }
      : {}),
  };

  const categoryLabel = product.category.replaceAll("-", " ");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <ViewItemTracker key={product.id} product={product} />
      <JsonLd
        data={[
          productJsonLd,
          breadcrumbJsonLd([
            { name: "Shop", path: "/shop" },
            { name: categoryLabel, path: `/category/${product.category}` },
            { name: product.title, path: `/product/${product.slug}` },
          ]),
        ]}
      />
      <nav className="mb-6 text-xs text-muted-foreground">
        <Link href="/shop">Shop</Link>
        <span className="mx-2">/</span>
        <Link href={`/category/${product.category}`} className="capitalize">
          {product.category}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.title}</span>
      </nav>
      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} title={product.title} />
        <div>
          {product.isNew ? (
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">New arrival</p>
          ) : null}
          <h1 className="mt-1 font-serif text-4xl">{product.title}</h1>
          <p className="mt-2 text-muted-foreground">{product.subtitle}</p>
          <div className="mt-8">
            <ProductForm product={product} />
          </div>
          <Accordion className="mt-10" defaultValue={["description"]}>
            <AccordionItem value="description">
              <AccordionTrigger>Description</AccordionTrigger>
              <AccordionContent>
                <p>{product.description}</p>
                <ul className="mt-3 list-disc space-y-1 pl-4">
                  {product.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="specs">
              <AccordionTrigger>Specifications</AccordionTrigger>
              <AccordionContent>
                <dl className="space-y-2">
                  {product.specs.map((spec) => (
                    <div key={spec.label} className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">{spec.label}</dt>
                      <dd>{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="shipping">
              <AccordionTrigger>Shipping & returns</AccordionTrigger>
              <AccordionContent>
                <p>
                  Pakistan: standard or express zone rates (free standard over PKR{" "}
                  {site.freeShippingThresholdPkr.toLocaleString("en-PK")}). GCC and international air
                  options at checkout. Unused items can be returned within 30 days.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
      <ProductReviews productId={product.id} productSlug={product.slug} initialReviews={reviews} />
      <ProductQa productId={product.id} productSlug={product.slug} initialQuestions={questions} />
      {related.length > 0 ? (
        <section className="mt-16">
          <h2 className="mb-6 font-serif text-3xl">You may also like</h2>
          <ProductGrid products={related} listId="related" listName="You may also like" />
        </section>
      ) : null}
    </div>
  );
}
