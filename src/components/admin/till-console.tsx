"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime, formatPkr } from "@/lib/admin-nav";
import { EXPENSE_CATEGORIES, EXPENSE_LABELS, TILL_MOVEMENT_LABELS, type TillControlSnapshot } from "@/lib/till";
import { TillBarChart, TillDonut, TillHBar } from "@/components/admin/till-charts";
import { Badge } from "@/components/ui/badge";

const TABS = ["overview", "register", "stock", "expenses", "reports"] as const;
type Tab = (typeof TABS)[number];

async function postTill(body: Record<string, unknown>) {
  const response = await fetch("/api/admin/till", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Could not update the till.");
}

export function TillConsole({ snapshot, rangeDays }: { snapshot: TillControlSnapshot; rangeDays: number }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [pending, setPending] = useState(false);
  const fin = snapshot.financials;

  async function run(body: Record<string, unknown>, success: string) {
    setPending(true);
    try {
      await postTill(body);
      toast.success(success);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the till.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Control</p>
          <h1 className="mt-1 font-serif text-3xl">Sales till</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            One place for cash, walk-in sales, stock value, expenses, and period financials. Guest
            checkout on the storefront is unchanged.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {[7, 30, 90].map((days) => (
            <Link
              key={days}
              href={`/admin/till?days=${days}`}
              className={`rounded-full border px-3 py-1 ${rangeDays === days ? "border-foreground" : "border-border"}`}
            >
              {days} days
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-full border px-3 py-1 text-sm capitalize ${
              tab === item ? "border-foreground bg-foreground text-background" : "border-border"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Net sales" value={formatPkr(fin.netSalesPkr)} hint={`${fin.orders} orders · ${fin.unitsSold} units`} />
            <Metric label="Expenses" value={formatPkr(fin.expensesPkr)} />
            <Metric
              label="Operating net"
              value={formatPkr(fin.netOperatingPkr)}
              hint={fin.netOperatingPkr < 0 ? "Expenses exceed sales" : "Sales minus expenses"}
            />
            <Metric
              label="Stock at retail"
              value={formatPkr(snapshot.stock.retailValuePkr)}
              hint={`${snapshot.stock.units} units · ${snapshot.stock.lowCount} low`}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Metric
              label="Open till"
              value={snapshot.till.open ? formatPkr(snapshot.till.expectedCashPkr) : "Closed"}
              hint={
                snapshot.till.open
                  ? `Float ${formatPkr(snapshot.till.open.openingFloatPkr)} · ${snapshot.till.open.openedByName}`
                  : "Open a session on the Register tab"
              }
            />
            <Metric label="Collected (paid)" value={formatPkr(fin.paidPkr)} />
            <Metric label="Outstanding COD" value={formatPkr(fin.outstandingCodPkr)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card title="Sales vs expenses">
              <TillBarChart data={snapshot.daily} />
            </Card>
            <Card title="Payment mix">
              <TillDonut
                label="Payment mix"
                slices={snapshot.byPayment.map((item) => ({
                  label: item.method,
                  value: item.amountPkr,
                }))}
              />
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Expense mix">
              {snapshot.expensesByCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expenses in this range.</p>
              ) : (
                <TillHBar
                  rows={snapshot.expensesByCategory.map((item) => ({
                    label: item.label,
                    value: item.amountPkr,
                  }))}
                />
              )}
            </Card>
            <Card title="Top products">
              {snapshot.topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ranked sales yet.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <tbody>
                    {snapshot.topProducts.map((item) => (
                      <tr key={item.title} className="border-t first:border-0">
                        <td className="py-2">{item.title}</td>
                        <td className="text-muted-foreground">{item.quantity}</td>
                        <td className="text-right">{formatPkr(item.revenuePkr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </section>
      ) : null}

      {tab === "register" ? (
        <RegisterPanel snapshot={snapshot} pending={pending} run={run} />
      ) : null}
      {tab === "stock" ? <StockPanel snapshot={snapshot} /> : null}
      {tab === "expenses" ? <ExpensesPanel snapshot={snapshot} pending={pending} run={run} /> : null}
      {tab === "reports" ? <ReportsPanel snapshot={snapshot} rangeDays={rangeDays} /> : null}
    </div>
  );
}

function RegisterPanel({
  snapshot,
  pending,
  run,
}: {
  snapshot: TillControlSnapshot;
  pending: boolean;
  run: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  const open = snapshot.till.open;
  const [float, setFloat] = useState("5000");
  const [counted, setCounted] = useState(String(snapshot.till.expectedCashPkr));
  const [moveAmount, setMoveAmount] = useState("");
  const [moveNote, setMoveNote] = useState("");
  const [variantId, setVariantId] = useState(snapshot.saleVariants[0]?.variantId ?? "");
  const [qty, setQty] = useState("1");
  const [walkIn, setWalkIn] = useState("");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-6">
        <Card title={open ? "Session open" : "Open till"}>
          {open ? (
            <div className="space-y-3 text-sm">
              <p>
                Opened {formatDateTime(open.openedAt)} by {open.openedByName}
              </p>
              <p>Float {formatPkr(open.openingFloatPkr)}</p>
              <p className="font-medium">Expected cash {formatPkr(snapshot.till.expectedCashPkr)}</p>
              <Field label="Counted cash (PKR)">
                <Input className="h-10" type="number" min={0} value={counted} onChange={(e) => setCounted(e.target.value)} />
              </Field>
              <Button
                type="button"
                disabled={pending}
                onClick={() => run({ action: "close", countedCashPkr: Number(counted) }, "Till closed.")}
              >
                Close till
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Field label="Opening float (PKR)">
                <Input className="h-10" type="number" min={0} value={float} onChange={(e) => setFloat(e.target.value)} />
              </Field>
              <Button
                type="button"
                disabled={pending}
                onClick={() => run({ action: "open", openingFloatPkr: Number(float) }, "Till opened.")}
              >
                Open till
              </Button>
            </div>
          )}
        </Card>

        <Card title="Cash in / out">
          <div className="space-y-3">
            <Field label="Amount (PKR)">
              <Input className="h-10" type="number" min={1} value={moveAmount} onChange={(e) => setMoveAmount(e.target.value)} />
            </Field>
            <Field label="Note">
              <Input className="h-10" value={moveNote} onChange={(e) => setMoveNote(e.target.value)} placeholder="Change, pickup, petty cash…" />
            </Field>
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={pending || !open}
                onClick={() =>
                  run({ action: "movement", type: "cash_in", amountPkr: Number(moveAmount), note: moveNote }, "Cash in recorded.")
                }
              >
                Cash in
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending || !open}
                onClick={() =>
                  run({ action: "movement", type: "cash_out", amountPkr: Number(moveAmount), note: moveNote }, "Cash out recorded.")
                }
              >
                Cash out
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Walk-in sale">
          <div className="space-y-3">
            <Field label="Variant">
              <select
                className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
              >
                {snapshot.saleVariants.map((item) => (
                  <option key={item.variantId} value={item.variantId}>
                    {item.label} · {formatPkr(item.pricePkr)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Qty">
                <Input className="h-10" type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
              </Field>
              <Field label="Customer (optional)">
                <Input className="h-10" value={walkIn} onChange={(e) => setWalkIn(e.target.value)} />
              </Field>
            </div>
            <Button
              type="button"
              disabled={pending || !open || !variantId}
              onClick={() =>
                run(
                  { action: "sale", variantId, quantity: Number(qty), fullName: walkIn },
                  "Till sale recorded.",
                )
              }
            >
              Take cash sale
            </Button>
            <p className="text-xs text-muted-foreground">Deducts stock, writes an order, and adds cash to the open till.</p>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card title="Collect COD">
          {snapshot.unpaidCod.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending cash-on-delivery orders.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {snapshot.unpaidCod.map((order) => (
                <li key={order.orderNumber} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                  <span>
                    <Link href={`/admin/orders/${order.orderNumber}`} className="font-medium underline-offset-4 hover:underline">
                      {order.orderNumber}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {order.fullName} · {formatPkr(order.totalPkr)}
                    </span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending || !open}
                    onClick={() => run({ action: "collect", orderNumber: order.orderNumber }, "Cash collected.")}
                  >
                    Collect
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Till movements">
          {snapshot.till.movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cash movements yet this session.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {snapshot.till.movements.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 border-b py-2 last:border-0">
                  <span>
                    {TILL_MOVEMENT_LABELS[item.type]}
                    {item.note ? <span className="block text-xs text-muted-foreground">{item.note}</span> : null}
                  </span>
                  <span className={item.amountPkr < 0 ? "text-destructive" : ""}>
                    {item.amountPkr > 0 ? "+" : ""}
                    {formatPkr(item.amountPkr)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Recent sessions">
          {snapshot.till.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {snapshot.till.sessions.map((session) => (
                <li key={session.id} className="flex justify-between gap-3">
                  <span>
                    {formatDateTime(session.openedAt)}
                    <span className="block text-xs text-muted-foreground">{session.openedByName}</span>
                  </span>
                  <span className="text-right">
                    <Badge variant={session.status === "open" ? "default" : "secondary"}>{session.status}</Badge>
                    {session.variancePkr !== undefined ? (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Var {formatPkr(session.variancePkr)}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function StockPanel({ snapshot }: { snapshot: TillControlSnapshot }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="SKUs" value={String(snapshot.stock.skuCount)} />
        <Metric label="Units on hand" value={String(snapshot.stock.units)} />
        <Metric label="Retail value" value={formatPkr(snapshot.stock.retailValuePkr)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Value by category">
          <TillHBar
            rows={snapshot.stock.byCategory.map((item) => ({
              label: item.category,
              value: item.retailValuePkr,
            }))}
          />
        </Card>
        <Card title="Recent stock movements">
          <ul className="space-y-2 text-sm">
            {snapshot.stock.movements.map((movement) => (
              <li key={movement.id} className="flex justify-between gap-3">
                <span>
                  {movement.type}
                  {movement.relatedOrderNumber ? ` · ${movement.relatedOrderNumber}` : ""}
                  <span className="block text-xs text-muted-foreground">{formatDateTime(movement.createdAt)}</span>
                </span>
                <span className={movement.change < 0 ? "text-destructive" : ""}>
                  {movement.change > 0 ? "+" : ""}
                  {movement.change}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th>SKU</th>
              <th>Variant</th>
              <th>Units</th>
              <th>Retail</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.stock.items.map((item) => (
              <tr key={item.variantId} className="border-t">
                <td className="px-4 py-2">{item.productTitle}</td>
                <td className="font-mono text-xs">{item.sku}</td>
                <td>
                  {item.color} · {item.size}
                </td>
                <td>
                  {item.stock}
                  {item.low ? (
                    <Badge variant="destructive" className="ml-2">
                      Low
                    </Badge>
                  ) : null}
                </td>
                <td>{formatPkr(item.retailValuePkr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExpensesPanel({
  snapshot,
  pending,
  run,
}: {
  snapshot: TillControlSnapshot;
  pending: boolean;
  run: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  const [category, setCategory] = useState<(typeof EXPENSE_CATEGORIES)[number]>("supplies");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [fromTill, setFromTill] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card title="Record expense">
        <div className="space-y-3">
          <Field label="Category">
            <select
              className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value as (typeof EXPENSE_CATEGORIES)[number])}
            >
              {EXPENSE_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {EXPENSE_LABELS[item]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount (PKR)">
            <Input className="h-10" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Note">
            <Input className="h-10" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was this for?" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={fromTill} onChange={(e) => setFromTill(e.target.checked)} />
            Pay from open till
          </label>
          <Button
            type="button"
            disabled={pending || !amount || !note}
            onClick={() =>
              run(
                { action: "expense", category, amountPkr: Number(amount), note, fromTill },
                "Expense recorded.",
              )
            }
          >
            Add expense
          </Button>
        </div>
      </Card>
      <div className="space-y-6">
        <Card title="By category">
          {snapshot.expensesByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses in this range.</p>
          ) : (
            <TillDonut
              label="Expenses"
              slices={snapshot.expensesByCategory.map((item) => ({
                label: item.label,
                value: item.amountPkr,
              }))}
            />
          )}
        </Card>
        <Card title="Ledger">
          {snapshot.expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {snapshot.expenses.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 border-b py-2 last:border-0">
                  <span>
                    {EXPENSE_LABELS[item.category]}
                    <span className="block text-xs text-muted-foreground">
                      {item.note} · {formatDateTime(item.incurredAt)}
                    </span>
                  </span>
                  <span className="text-right">
                    {formatPkr(item.amountPkr)}
                    <button
                      type="button"
                      className="mt-1 block text-xs text-destructive"
                      disabled={pending}
                      onClick={() => run({ action: "deleteExpense", id: item.id }, "Expense removed.")}
                    >
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function ReportsPanel({ snapshot, rangeDays }: { snapshot: TillControlSnapshot; rangeDays: number }) {
  const fin = snapshot.financials;
  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Last {rangeDays} days · generated {formatDateTime(snapshot.generatedAt)}</p>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          Print report
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Gross (before discount)" value={formatPkr(fin.grossPkr)} />
        <Metric label="Discounts" value={formatPkr(fin.discountsPkr)} />
        <Metric label="Shipping collected" value={formatPkr(fin.shippingPkr)} />
        <Metric label="Cancelled / returned" value={formatPkr(fin.cancelledPkr)} />
      </div>
      <Card title="Profit and loss (retail)">
        <table className="w-full text-sm">
          <tbody>
            <Row label="Net sales" value={formatPkr(fin.netSalesPkr)} />
            <Row label="Expenses" value={`(${formatPkr(fin.expensesPkr)})`} />
            <Row label="Operating net" value={formatPkr(fin.netOperatingPkr)} strong />
            <Row label="Paid in" value={formatPkr(fin.paidPkr)} />
            <Row label="Outstanding COD" value={formatPkr(fin.outstandingCodPkr)} />
            <Row label="Stock at retail" value={formatPkr(snapshot.stock.retailValuePkr)} />
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">
          Operating net is sales minus recorded expenses. It is not COGS profit unless you log stock
          purchases as expenses.
        </p>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Orders by status">
          <TillHBar rows={snapshot.byStatus.map((item) => ({ label: item.status, value: item.amountPkr }))} />
        </Card>
        <Card title="Daily totals">
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-1">Day</th>
                  <th>Orders</th>
                  <th>Sales</th>
                  <th>Expenses</th>
                </tr>
              </thead>
              <tbody>
                {[...snapshot.daily].reverse().map((row) => (
                  <tr key={row.date} className="border-t">
                    <td className="py-1">{row.date}</td>
                    <td>{row.orders}</td>
                    <td>{formatPkr(row.salesPkr)}</td>
                    <td>{formatPkr(row.expensesPkr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="mb-4 font-serif text-2xl">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr className="border-t">
      <td className="py-2">{label}</td>
      <td className={`py-2 text-right ${strong ? "font-medium" : ""}`}>{value}</td>
    </tr>
  );
}
