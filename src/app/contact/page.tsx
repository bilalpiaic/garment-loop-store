import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
};

export default function ContactPage() {
  const wa = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent("Hi GarmentLoop, I have a question about an order / size.")}`;
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Contact</p>
      <h1 className="mt-2 font-serif text-4xl">We are on WhatsApp.</h1>
      <p className="mt-4 text-muted-foreground">
        Most customers reach us there for size advice, order status, and returns. Email works too if
        you prefer a paper trail.
      </p>
      <div className="mt-8 space-y-3 text-sm">
        <p>
          WhatsApp · <a className="underline underline-offset-4" href={wa}>{site.phone}</a>
        </p>
        <p>
          Email · <a className="underline underline-offset-4" href={`mailto:${site.email}`}>{site.email}</a>
        </p>
        <p>Studio · {site.address}</p>
        <p>Hours · Sunday–Thursday, 11:00–19:00 PKT</p>
      </div>
      <Button className="mt-8 h-11 px-6" render={<a href={wa} target="_blank" rel="noreferrer" />}>
        Open WhatsApp
      </Button>
    </div>
  );
}
