import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPageView } from "@/components/content-page-view";
import { getContentPage } from "@/lib/platform";
import { seedContentPages } from "@/lib/seed-demo";
import { pageMeta } from "@/lib/seo";

const ALLOWED = new Set(["privacy", "terms", "shipping"]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page =
    (await getContentPage(slug)) ?? seedContentPages().find((item) => item.slug === slug);
  return pageMeta({
    title: page?.title ?? "Policy",
    description: page?.excerpt ?? "GarmentLoop store policy.",
    path: `/policies/${slug}`,
  });
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!ALLOWED.has(slug)) notFound();
  const page =
    (await getContentPage(slug)) ?? seedContentPages().find((item) => item.slug === slug);
  if (!page) notFound();
  return <ContentPageView eyebrow="Policies" title={page.title} body={page.body} />;
}
