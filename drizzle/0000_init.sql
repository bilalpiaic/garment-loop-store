CREATE TABLE IF NOT EXISTS inventory (
  variant_id text PRIMARY KEY,
  stock integer NOT NULL CHECK (stock >= 0)
);

CREATE TABLE IF NOT EXISTS orders (
  order_number text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  customer_id text,
  customer jsonb NOT NULL,
  items jsonb NOT NULL,
  subtotal_pkr integer NOT NULL,
  shipping_pkr integer NOT NULL,
  tax_pkr integer NOT NULL DEFAULT 0,
  discount_pkr integer NOT NULL DEFAULT 0,
  total_pkr integer NOT NULL,
  payment_method text NOT NULL,
  payment_status text NOT NULL,
  status text NOT NULL,
  currency text NOT NULL,
  shipping_method_id text,
  shipping_label text,
  tracking_number text,
  courier text,
  notes text,
  discount_code text,
  stripe_session_id text
);

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE TABLE IF NOT EXISTS platform_state (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
