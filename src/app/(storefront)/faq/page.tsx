import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping & returns",
};

const items = [
  {
    q: "Do you offer cash on delivery?",
    a: "Yes. COD is available across Pakistan. International orders use bank transfer or the demo card checkout.",
  },
  {
    q: "How much is shipping?",
    a: "Pakistan: PKR 300, or free over PKR 8,000. International dispatch is a flat fee shown at checkout. Duties, if any, are paid on arrival.",
  },
  {
    q: "How long does delivery take?",
    a: "Major Pakistani cities usually 2–4 working days. Other areas 4–7. International timing depends on the destination.",
  },
  {
    q: "What is your return policy?",
    a: "Unused items with tags can be returned within 30 days. Sale items are exchange-only unless faulty.",
  },
  {
    q: "How do sizes run?",
    a: "Jackets and knits are regular. If you are between sizes, size up in puffers and down in merino for a closer layer.",
  },
  {
    q: "How do I track an order?",
    a: "We WhatsApp the order number after packing. Courier tracking lands in a later release; for now we send updates by hand.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Help</p>
      <h1 className="mt-2 font-serif text-4xl">Shipping, returns, and sizing</h1>
      <dl className="mt-10 space-y-8">
        {items.map((item) => (
          <div key={item.q}>
            <dt className="font-medium">{item.q}</dt>
            <dd className="mt-2 text-muted-foreground">{item.a}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
