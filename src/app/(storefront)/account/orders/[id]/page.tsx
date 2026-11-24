import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrderReceipt } from "@/components/order-receipt";
import { ReturnRequestForm } from "@/components/account/return-request-form";
import { getCustomerSession, getOrder, listReturnsForCustomer } from "@/lib/platform";
import { emailConfigured, emailMode } from "@/lib/email";
import { Badge } from "@/components/ui/badge";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Order",
  description: "Your GarmentLoop order details.",
  path: "/account/orders",
  index: false,
});

export default async function AccountOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCustomerSession();
  if (!session) redirect("/account/login");
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const owns =
    order.customerId === session.customer.id ||
    order.customer.email.toLowerCase() === session.customer.email;
  if (!owns) notFound();

  const returns = await listReturnsForCustomer(session.customer.id, session.customer.email);
  const related = returns.filter((item) => item.orderNumber === order.orderNumber);

  return (
    <div className="space-y-10 pb-16">
      <OrderReceipt
        order={order}
        emailNote={
          emailConfigured()
            ? `Confirmation emails send via ${emailMode()}.`
            : "Email provider not configured — messages are logged (mock) until RESEND_API_KEY or SMTP_* is set."
        }
      />
      <div className="mx-auto max-w-2xl px-4 space-y-6">
        {related.length > 0 ? (
          <section className="rounded-xl border p-5">
            <h2 className="font-serif text-2xl">Return requests</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {related.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3">
                  <Link href="/account/returns" className="underline underline-offset-4">
                    {item.id}
                  </Link>
                  <Badge variant="secondary" className="capitalize">
                    {item.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <ReturnRequestForm order={order} />
      </div>
    </div>
  );
}
