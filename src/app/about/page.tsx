import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About",
  description: "GarmentLoop is a premium winter apparel house based in Lahore.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">The house</p>
      <h1 className="mt-2 font-serif text-4xl">Winter clothing with a longer life.</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-muted-foreground">
        <p>
          GarmentLoop started as a simple idea: winter clothes that feel as considered as they look.
          We design in Lahore for people who want warmth without the marketplace noise — no flashing
          discounts, no mystery fabric, no forced app download.
        </p>
        <p>
          The first collection is built around Pakistani winters and travel. Puffers that pack for a
          flight, wool coats that hold a crease, merino that does not itch after a long day. We
          source fill, wool, and hardware for durability, then cut local so we can stand behind
          every size.
        </p>
        <p>
          Buying should be as straightforward as the clothes. Cash on delivery is available across
          Pakistan. International customers can pay by transfer or a demo card flow while we finish
          live gateway keys. If something is wrong, write to us — we would rather fix it than hide
          behind a chatbot.
        </p>
      </div>
      <Button className="mt-8 h-11 px-6" render={<Link href="/collection/winter-collection" />}>
        Shop the collection
      </Button>
    </article>
  );
}
