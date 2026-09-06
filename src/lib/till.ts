import type { Order } from "@/lib/order-model";
import type { InventoryMovement } from "@/lib/identity";
import type { Product } from "@/lib/catalog";

export const EXPENSE_CATEGORIES = [
  "rent",
  "utilities",
  "salaries",
  "packaging",
  "shipping",
  "marketing",
  "supplies",
  "purchases",
  "drawings",
  "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type Expense = {
  id: string;
  category: ExpenseCategory;
  amountPkr: number;
  note: string;
  incurredAt: string;
  tillSessionId?: string;
  actorId?: string;
  createdAt: string;
};

export type TillSession = {
  id: string;
  openedAt: string;
  openedBy: string;
  openedByName: string;
  openingFloatPkr: number;
  note?: string;
  closedAt?: string;
  closedBy?: string;
  closedByName?: string;
  countedCashPkr?: number;
  expectedCashPkr?: number;
  variancePkr?: number;
  status: "open" | "closed";
};

export type TillMovementType = "sale_cash" | "cash_in" | "cash_out" | "expense";

export type TillMovement = {
  id: string;
  tillSessionId: string;
  type: TillMovementType;
  amountPkr: number;
  note?: string;
  relatedOrderNumber?: string;
  relatedExpenseId?: string;
  actorId?: string;
  createdAt: string;
};

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  rent: "Rent",
  utilities: "Utilities",
  salaries: "Salaries",
  packaging: "Packaging",
  shipping: "Courier / shipping",
  marketing: "Marketing",
  supplies: "Store supplies",
  purchases: "Stock purchases",
  drawings: "Owner drawings",
  other: "Other",
};

export const TILL_MOVEMENT_LABELS: Record<TillMovementType, string> = {
  sale_cash: "Cash sale",
  cash_in: "Cash in",
  cash_out: "Cash out",
  expense: "Expense",
};

export function startOfDayIso(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
}

export function addDaysIso(from: string, days: number) {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function dayKey(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isSaleOrder(order: Order) {
  return order.status !== "cancelled" && order.status !== "returned";
}

export function expectedTillCash(session: TillSession, movements: TillMovement[]) {
  const delta = movements
    .filter((item) => item.tillSessionId === session.id)
    .reduce((sum, item) => sum + item.amountPkr, 0);
  return session.openingFloatPkr + delta;
}

export type StockRow = {
  productId: string;
  productTitle: string;
  slug: string;
  category: string;
  variantId: string;
  sku: string;
  color: string;
  size: string;
  stock: number;
  unitPricePkr: number;
  retailValuePkr: number;
  low: boolean;
};

export type TillControlSnapshot = {
  rangeDays: number;
  rangeFrom: string;
  generatedAt: string;
  financials: {
    orders: number;
    unitsSold: number;
    grossPkr: number;
    discountsPkr: number;
    shippingPkr: number;
    netSalesPkr: number;
    cancelledPkr: number;
    paidPkr: number;
    outstandingCodPkr: number;
    expensesPkr: number;
    netOperatingPkr: number;
  };
  daily: { date: string; salesPkr: number; expensesPkr: number; orders: number }[];
  byPayment: { method: string; count: number; amountPkr: number }[];
  byStatus: { status: string; count: number; amountPkr: number }[];
  expensesByCategory: { category: ExpenseCategory; label: string; amountPkr: number }[];
  topProducts: { title: string; quantity: number; revenuePkr: number }[];
  stock: {
    skuCount: number;
    units: number;
    retailValuePkr: number;
    lowCount: number;
    byCategory: { category: string; units: number; retailValuePkr: number }[];
    items: StockRow[];
    movements: InventoryMovement[];
  };
  till: {
    open: TillSession | null;
    expectedCashPkr: number;
    sessions: TillSession[];
    movements: TillMovement[];
  };
  expenses: Expense[];
  unpaidCod: {
    orderNumber: string;
    fullName: string;
    totalPkr: number;
    createdAt: string;
  }[];
  saleVariants: {
    variantId: string;
    label: string;
    stock: number;
    pricePkr: number;
  }[];
};

export function computeTillControl(input: {
  rangeDays: number;
  orders: Order[];
  products: Product[];
  stock: Record<string, number>;
  lowStockThreshold: number;
  movements: InventoryMovement[];
  tillSessions: TillSession[];
  tillMovements: TillMovement[];
  expenses: Expense[];
}): TillControlSnapshot {
  const rangeDays = Math.min(90, Math.max(7, input.rangeDays));
  const rangeFrom = addDaysIso(startOfDayIso(), -(rangeDays - 1));
  const inRange = (iso: string) => iso >= rangeFrom;
  const salesOrders = input.orders.filter(isSaleOrder);
  const rangedSales = salesOrders.filter((order) => inRange(order.createdAt));
  const rangedCancelled = input.orders.filter(
    (order) => (order.status === "cancelled" || order.status === "returned") && inRange(order.createdAt),
  );
  const rangedExpenses = input.expenses.filter((item) => inRange(item.incurredAt || item.createdAt));

  const grossPkr = rangedSales.reduce((sum, order) => sum + order.subtotalPkr, 0);
  const discountsPkr = rangedSales.reduce((sum, order) => sum + (order.discountPkr ?? 0), 0);
  const shippingPkr = rangedSales.reduce((sum, order) => sum + order.shippingPkr, 0);
  const netSalesPkr = rangedSales.reduce((sum, order) => sum + order.totalPkr, 0);
  const expensesPkr = rangedExpenses.reduce((sum, item) => sum + item.amountPkr, 0);
  const unitsSold = rangedSales.reduce(
    (sum, order) => sum + order.items.reduce((inner, line) => inner + line.quantity, 0),
    0,
  );
  const paidPkr = rangedSales
    .filter((order) => order.paymentStatus === "paid")
    .reduce((sum, order) => sum + order.totalPkr, 0);
  const outstandingCodPkr = input.orders
    .filter(
      (order) =>
        isSaleOrder(order) &&
        order.paymentMethod === "cod" &&
        order.paymentStatus === "pending",
    )
    .reduce((sum, order) => sum + order.totalPkr, 0);

  const dailyMap = new Map<string, { date: string; salesPkr: number; expensesPkr: number; orders: number }>();
  for (let i = 0; i < rangeDays; i += 1) {
    const key = dayKey(addDaysIso(rangeFrom, i));
    dailyMap.set(key, { date: key, salesPkr: 0, expensesPkr: 0, orders: 0 });
  }
  for (const order of rangedSales) {
    const row = dailyMap.get(dayKey(order.createdAt));
    if (!row) continue;
    row.salesPkr += order.totalPkr;
    row.orders += 1;
  }
  for (const expense of rangedExpenses) {
    const row = dailyMap.get(dayKey(expense.incurredAt || expense.createdAt));
    if (!row) continue;
    row.expensesPkr += expense.amountPkr;
  }

  const paymentMap = new Map<string, { method: string; count: number; amountPkr: number }>();
  const statusMap = new Map<string, { status: string; count: number; amountPkr: number }>();
  for (const order of rangedSales) {
    const pay = paymentMap.get(order.paymentMethod) ?? {
      method: order.paymentMethod,
      count: 0,
      amountPkr: 0,
    };
    pay.count += 1;
    pay.amountPkr += order.totalPkr;
    paymentMap.set(order.paymentMethod, pay);
    const status = statusMap.get(order.status) ?? { status: order.status, count: 0, amountPkr: 0 };
    status.count += 1;
    status.amountPkr += order.totalPkr;
    statusMap.set(order.status, status);
  }

  const expenseCat = new Map<ExpenseCategory, number>();
  for (const category of EXPENSE_CATEGORIES) expenseCat.set(category, 0);
  for (const expense of rangedExpenses) {
    expenseCat.set(expense.category, (expenseCat.get(expense.category) ?? 0) + expense.amountPkr);
  }

  const productMap = new Map<string, { title: string; quantity: number; revenuePkr: number }>();
  for (const order of rangedSales) {
    for (const line of order.items) {
      const current = productMap.get(line.productId) ?? {
        title: line.productTitle,
        quantity: 0,
        revenuePkr: 0,
      };
      current.quantity += line.quantity;
      current.revenuePkr += line.totalPkr;
      productMap.set(line.productId, current);
    }
  }

  const items: StockRow[] = input.products.flatMap((product) =>
    product.variants.map((variant) => {
      const stock = input.stock[variant.id] ?? variant.stock;
      const unitPricePkr = variant.salePricePkr ?? variant.pricePkr;
      return {
        productId: product.id,
        productTitle: product.title,
        slug: product.slug,
        category: product.category,
        variantId: variant.id,
        sku: variant.sku,
        color: variant.color,
        size: variant.size,
        stock,
        unitPricePkr,
        retailValuePkr: stock * unitPricePkr,
        low: stock <= input.lowStockThreshold,
      };
    }),
  );
  const categoryMap = new Map<string, { category: string; units: number; retailValuePkr: number }>();
  for (const item of items) {
    const current = categoryMap.get(item.category) ?? {
      category: item.category,
      units: 0,
      retailValuePkr: 0,
    };
    current.units += item.stock;
    current.retailValuePkr += item.retailValuePkr;
    categoryMap.set(item.category, current);
  }

  const open = input.tillSessions.find((session) => session.status === "open") ?? null;
  const expectedCashPkr = open ? expectedTillCash(open, input.tillMovements) : 0;

  return {
    rangeDays,
    rangeFrom,
    generatedAt: new Date().toISOString(),
    financials: {
      orders: rangedSales.length,
      unitsSold,
      grossPkr,
      discountsPkr,
      shippingPkr,
      netSalesPkr,
      cancelledPkr: rangedCancelled.reduce((sum, order) => sum + order.totalPkr, 0),
      paidPkr,
      outstandingCodPkr,
      expensesPkr,
      netOperatingPkr: netSalesPkr - expensesPkr,
    },
    daily: [...dailyMap.values()],
    byPayment: [...paymentMap.values()].sort((a, b) => b.amountPkr - a.amountPkr),
    byStatus: [...statusMap.values()].sort((a, b) => b.amountPkr - a.amountPkr),
    expensesByCategory: EXPENSE_CATEGORIES.map((category) => ({
      category,
      label: EXPENSE_LABELS[category],
      amountPkr: expenseCat.get(category) ?? 0,
    })).filter((item) => item.amountPkr > 0),
    topProducts: [...productMap.values()].sort((a, b) => b.revenuePkr - a.revenuePkr).slice(0, 8),
    stock: {
      skuCount: items.length,
      units: items.reduce((sum, item) => sum + item.stock, 0),
      retailValuePkr: items.reduce((sum, item) => sum + item.retailValuePkr, 0),
      lowCount: items.filter((item) => item.low).length,
      byCategory: [...categoryMap.values()].sort((a, b) => b.retailValuePkr - a.retailValuePkr),
      items: items.sort((a, b) => a.productTitle.localeCompare(b.productTitle)),
      movements: input.movements.slice(0, 25),
    },
    till: {
      open,
      expectedCashPkr,
      sessions: input.tillSessions.slice(0, 20),
      movements: input.tillMovements.filter((item) => !open || item.tillSessionId === open.id).slice(0, 40),
    },
    expenses: [...input.expenses].sort((a, b) => (b.incurredAt > a.incurredAt ? 1 : -1)).slice(0, 80),
    unpaidCod: input.orders
      .filter(
        (order) =>
          isSaleOrder(order) && order.paymentMethod === "cod" && order.paymentStatus === "pending",
      )
      .slice(0, 20)
      .map((order) => ({
        orderNumber: order.orderNumber,
        fullName: order.customer.fullName,
        totalPkr: order.totalPkr,
        createdAt: order.createdAt,
      })),
    saleVariants: items
      .filter((item) => item.stock > 0)
      .map((item) => ({
        variantId: item.variantId,
        label: `${item.productTitle} · ${item.color} ${item.size} (${item.stock})`,
        stock: item.stock,
        pricePkr: item.unitPricePkr,
      })),
  };
}
