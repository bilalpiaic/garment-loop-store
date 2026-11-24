import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Newsreader, Geist } from "next/font/google";
import { Providers } from "@/components/providers";
import { JsonLd } from "@/components/json-ld";
import { site } from "@/lib/site";
import {
  absoluteUrl,
  DEFAULT_OG_IMAGE,
  organizationJsonLd,
  siteOrigin,
  websiteJsonLd,
} from "@/lib/seo";
import "./globals.css";

const sans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const serif = Newsreader({
  variable: "--font-heading",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    default: `${site.name} — Circular wardrobe atelier`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: site.name,
    description: site.description,
    siteName: site.name,
    url: absoluteUrl("/"),
    locale: "en_PK",
    type: "website",
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
  twitter: {
    card: "summary_large_image",
    title: site.name,
    description: site.description,
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground antialiased">
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
