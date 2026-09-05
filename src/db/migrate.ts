import { allVariants } from "@/lib/catalog";
import { getSql } from "@/db/client";

const PLACE_ORDER_FN = `
CREATE OR REPLACE FUNCTION place_order(p_order jsonb)
RETURNS text
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_item jsonb;
  v_updated int;
  v_order_number text;
BEGIN
  v_order_number := 'GL-' || lpad(nextval('order_number_seq')::text, 4, '0');

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order->'items')
  LOOP
    UPDATE inventory
       SET stock = stock - (v_item->>'quantity')::int
     WHERE variant_id = v_item->>'variantId'
       AND stock >= (v_item->>'quantity')::int;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
      RAISE EXCEPTION 'out of stock: %', v_item->>'variantId'
        USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  INSERT INTO orders (
    order_number, created_at, customer, items,
    subtotal_pkr, shipping_pkr, total_pkr,
    payment_method, payment_status, status, currency
  ) VALUES (
    v_order_number,
    COALESCE((p_order->>'createdAt')::timestamptz, now()),
    p_order->'customer',
    p_order->'items',
    (p_order->>'subtotalPkr')::int,
    (p_order->>'shippingPkr')::int,
    (p_order->>'totalPkr')::int,
    p_order->>'paymentMethod',
    p_order->>'paymentStatus',
    p_order->>'status',
    p_order->>'currency'
  );

  RETURN v_order_number;
END;
$fn$;
`;

let ready: Promise<void> | null = null;

async function applySchema() {
  const sql = getSql();
  if (!sql) {
    throw new Error("DATABASE_URL is not set.");
  }

  await sql`CREATE TABLE IF NOT EXISTS inventory (
    variant_id text PRIMARY KEY,
    stock integer NOT NULL CHECK (stock >= 0)
  )`;

  await sql`CREATE TABLE IF NOT EXISTS orders (
    order_number text PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    customer jsonb NOT NULL,
    items jsonb NOT NULL,
    subtotal_pkr integer NOT NULL,
    shipping_pkr integer NOT NULL,
    total_pkr integer NOT NULL,
    payment_method text NOT NULL,
    payment_status text NOT NULL,
    status text NOT NULL,
    currency text NOT NULL
  )`;

  await sql`CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1`;
  await sql.query(PLACE_ORDER_FN);

  for (const { variant } of allVariants()) {
    await sql`
      INSERT INTO inventory (variant_id, stock)
      VALUES (${variant.id}, ${variant.stock})
      ON CONFLICT (variant_id) DO NOTHING
    `;
  }
}

export function ensureDatabase() {
  if (!ready) {
    ready = applySchema();
  }
  return ready;
}

export async function migrateDatabase() {
  ready = applySchema();
  await ready;
}
