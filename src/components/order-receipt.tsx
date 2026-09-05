import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { whatsappOrderLink, type Order } from "@/lib/order-model";

export function OrderReceipt({ order }: { order: Order }) {
  const wa = whatsappOrderLink(order);
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Confirmed</p>
      <h1 className="mt-2 font-serif text-4xl">Thank you, {order.customer.fullName.split(" ")[0]}.</h1>
      <p className="mt-3 text-muted-foreground">
        Order <span className="font-medium text-foreground">{order.orderNumber}</span> is{" "}
        {order.status}. We will email {order.customer.email} and follow up on WhatsApp.
      </p>
      <div className="mt-8 rounded-xl border p-5 text-sm">
        <div className="flex justify-between">
          <span>Payment</span>
          <span className="capitalize">
            {order.paymentMethod.replace("_", " ")} · {order.paymentStatus}
          </span>
        </div>
        <div className="mt-2 flex justify-between">
          <span>Delivery to</span>
          <span className="text-right">
            {order.customer.area}, {order.customer.city}
          </span>
        </div>
        <ul className="mt-4 space-y-2 border-t pt-4">
          {order.items.map((item) => (
            <li key={item.variantId} className="flex justify-between gap-3">
              <span>
                {item.productTitle}
                <span className="block text-xs text-muted-foreground">
                  {item.color} · {item.size} · ×{item.quantity}
                </span>
              </span>
              <span>{formatMoney(item.totalPkr, order.currency)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t pt-4 font-medium">
          <span>Total</span>
          <span>{formatMoney(order.totalPkr, order.currency)}</span>
        </div>
        {order.paymentMethod === "bank_transfer" ? (
          <p className="mt-4 text-muted-foreground">
            Transfer to GarmentLoop (demo IBAN PK00 GARL 0000 0000 0000) using the order number as
            reference. We confirm packing once funds clear.
          </p>
        ) : null}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          className="h-11 px-6"
          nativeButton={false}
          render={<a href={wa} target="_blank" rel="noreferrer" />}
        >
          Confirm on WhatsApp
        </Button>
        <Button variant="outline" className="h-11 px-6" nativeButton={false} render={<Link href="/shop" />}>
          Continue shopping
        </Button>
      </div>
    </div>
  );
}
