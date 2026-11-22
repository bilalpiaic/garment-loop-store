import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About",
  description:
    "GarmentLoop is a circular-wardrobe atelier — premium garments designed for longevity and reuse.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Circular atelier</p>
      <h1 className="mt-2 font-serif text-4xl">Clothing with a longer life — and a way back.</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-muted-foreground">
        <p>
          GarmentLoop is a modern atelier for circular fashion. We design winter outerwear and knits
          that feel as considered as they look — dense wool, honest fill power, and fits meant to
          travel seasons, not just weeks.
        </p>
        <p>
          The first collection is built around Pakistani winters and travel. Puffers that pack for a
          flight, wool coats that hold a crease, merino that does not itch after a long day. We cut
          locally so we can stand behind every size, with live care, take-back, and repair programs
          so garments stay in the loop.
        </p>
        <p>
          Buying should be as straightforward as the clothes. Cash on delivery is available across
          Pakistan. International customers can pay by transfer or a demo card flow while we finish
          live Stripe keys. If something is wrong, write to us — we would rather fix it than hide
          behind a chatbot.
        </p>
      </div>
      <Button className="mt-8 h-11 px-6" render={<Link href="/collection/winter-collection" />}>
        Shop the collection
      </Button>
    </article>
  );
}
