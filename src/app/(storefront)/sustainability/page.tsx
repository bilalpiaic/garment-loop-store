import type { Metadata } from "next";
import { ContentPageView } from "@/components/content-page-view";
import { getContentPage } from "@/lib/platform";
import { seedContentPages } from "@/lib/seed-demo";

export const metadata: Metadata = {
  title: "Sustainability",
  description: "Circular wardrobe principles at GarmentLoop.",
};

export default async function SustainabilityPage() {
  const page = (await getContentPage("sustainability")) ?? seedContentPages().find((item) => item.slug === "sustainability")!;
  return <ContentPageView eyebrow="Circular atelier" title={page.title} body={page.body} />;
}
