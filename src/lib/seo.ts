import type { Metadata } from "next";
import { site } from "@/lib/site";

/** Absolute public origin for canonicals, sitemap, and JSON-LD. */
export function siteOrigin() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return site.url.replace(/\/$/, "");
}

export function absoluteUrl(path = "/") {
  const origin = siteOrigin();
  if (!path || path === "/") return origin;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export const DEFAULT_OG_IMAGE = "/og-default.svg";

type PageMetaInput = {
  title: string;
  description: string;
  path?: string;
  images?: string[];
  index?: boolean;
  /** Skip the root layout title template (e.g. home brand title). */
  absoluteTitle?: boolean;
};

export function pageMeta({
  title,
  description,
  path = "/",
  images,
  index = true,
  absoluteTitle = false,
}: PageMetaInput): Metadata {
  const url = absoluteUrl(path);
  const ogImages = (images?.length ? images : [DEFAULT_OG_IMAGE]).map((src) =>
    src.startsWith("http") ? src : absoluteUrl(src),
  );
  const displayTitle = absoluteTitle ? title : `${title} · ${site.name}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: url,
      languages: {
        "en-PK": url,
        "x-default": url,
      },
    },
    openGraph: {
      title: displayTitle,
      description,
      url,
      siteName: site.name,
      locale: "en_PK",
      type: "website",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: displayTitle,
      description,
      images: ogImages,
    },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: siteOrigin(),
    email: site.email,
    telephone: site.phone,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Lahore",
      addressCountry: "PK",
    },
    logo: absoluteUrl("/icon.svg"),
    description: site.description,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: siteOrigin(),
    description: site.description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteOrigin()}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqPageJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}
