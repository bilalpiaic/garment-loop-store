import { ContentPageView } from "@/components/content-page-view";
import { getContentPage } from "@/lib/platform";
import { seedContentPages } from "@/lib/seed-demo";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Sustainability",
  description: "Circular wardrobe principles at GarmentLoop.",
  path: "/sustainability",
});

export default async function SustainabilityPage() {
  const page = (await getContentPage("sustainability")) ?? seedContentPages().find((item) => item.slug === "sustainability")!;
  return <ContentPageView eyebrow="Circular atelier" title={page.title} body={page.body} />;
}
