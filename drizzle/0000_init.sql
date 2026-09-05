CREATE TABLE IF NOT EXISTS inventory (
  variant_id text PRIMARY KEY,
  stock integer NOT NULL CHECK (stock >= 0)
);

CREATE TABLE IF NOT EXISTS orders (
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
);

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;
