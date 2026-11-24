import { allVariants } from "@/lib/catalog";
import { getDialect, getMysqlPool, getSql } from "@/db/client";

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

async function applyPostgresSchema() {
  const sql = getSql();
  if (!sql) {
    throw new Error("DATABASE_URL is not set for Postgres.");
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
  await sql`CREATE TABLE IF NOT EXISTS platform_state (
    id text PRIMARY KEY,
    data jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at timestamptz`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id text`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_pkr integer NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number text`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier text`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes text`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_code text`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_pkr integer NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method_id text`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_label text`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id text`;
  await sql.query(PLACE_ORDER_FN);

  for (const { variant } of allVariants()) {
    await sql`
      INSERT INTO inventory (variant_id, stock)
      VALUES (${variant.id}, ${variant.stock})
      ON CONFLICT (variant_id) DO NOTHING
    `;
  }
}

async function applyMysqlSchema() {
  const pool = getMysqlPool();
  if (!pool) {
    throw new Error("MySQL DATABASE_URL or MYSQL_* is not set.");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      variant_id VARCHAR(191) PRIMARY KEY,
      stock INT NOT NULL,
      CHECK (stock >= 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      order_number VARCHAR(64) PRIMARY KEY,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL,
      customer_id VARCHAR(191) NULL,
      customer JSON NOT NULL,
      items JSON NOT NULL,
      subtotal_pkr INT NOT NULL,
      shipping_pkr INT NOT NULL,
      tax_pkr INT NOT NULL DEFAULT 0,
      discount_pkr INT NOT NULL DEFAULT 0,
      total_pkr INT NOT NULL,
      payment_method VARCHAR(64) NOT NULL,
      payment_status VARCHAR(64) NOT NULL,
      status VARCHAR(64) NOT NULL,
      currency VARCHAR(8) NOT NULL,
      shipping_method_id VARCHAR(191) NULL,
      shipping_label TEXT NULL,
      tracking_number VARCHAR(191) NULL,
      courier VARCHAR(191) NULL,
      notes TEXT NULL,
      discount_code VARCHAR(64) NULL,
      stripe_session_id VARCHAR(191) NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_state (
      id VARCHAR(64) PRIMARY KEY,
      data JSON NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_number_seq (
      id INT NOT NULL PRIMARY KEY DEFAULT 1,
      next_val INT NOT NULL DEFAULT 1
    ) ENGINE=InnoDB
  `);
  await pool.query(`
    INSERT IGNORE INTO order_number_seq (id, next_val) VALUES (1, 1)
  `);

  for (const { variant } of allVariants()) {
    await pool.query(
      `INSERT IGNORE INTO inventory (variant_id, stock) VALUES (?, ?)`,
      [variant.id, variant.stock],
    );
  }
}

async function applySchema() {
  const dialect = getDialect();
  if (dialect === "mysql") {
    await applyMysqlSchema();
    return;
  }
  if (dialect === "postgres") {
    await applyPostgresSchema();
    return;
  }
  throw new Error("DATABASE_URL or MYSQL_* is not set.");
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
