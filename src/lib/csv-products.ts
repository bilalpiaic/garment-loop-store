import type { Product, ProductStatus, ProductVariant } from "@/lib/catalog";
import { slugify } from "@/lib/slug";

export type CsvImportRow = {
  line: number;
  sku: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  category: string;
  collections: string[];
  status: ProductStatus;
  color: string;
  colorHex: string;
  size: string;
  pricePkr: number;
  salePricePkr?: number;
  stock: number;
  imageSrc: string;
  imageAlt: string;
  featured: boolean;
  isNew: boolean;
  features: string[];
};

export type CsvRowError = {
  line: number;
  field?: string;
  message: string;
};

export type CsvProductPreview = {
  action: "create" | "update";
  productId: string;
  slug: string;
  title: string;
  variantCount: number;
  skus: string[];
};

export type CsvParseResult = {
  rows: CsvImportRow[];
  errors: CsvRowError[];
  preview: CsvProductPreview[];
};

const REQUIRED_HEADERS = ["sku", "title", "category", "color", "size", "price_pkr", "stock"] as const;

export function parseProductCsv(text: string, existing: Product[]): CsvParseResult {
  const { headers, records, parseErrors } = parseCsvTable(text);
  const errors: CsvRowError[] = [...parseErrors];
  if (records.length === 0 && errors.length === 0) {
    errors.push({ line: 1, message: "CSV has no data rows." });
  }

  const headerSet = new Set(headers);
  for (const required of REQUIRED_HEADERS) {
    if (!headerSet.has(required)) {
      errors.push({ line: 1, field: required, message: `Missing required column "${required}".` });
    }
  }

  const rows: CsvImportRow[] = [];
  if (errors.some((error) => error.line === 1 && error.field && REQUIRED_HEADERS.includes(error.field as (typeof REQUIRED_HEADERS)[number]))) {
    return { rows: [], errors, preview: [] };
  }

  const seenSkus = new Set<string>();
  const existingSkuToProduct = new Map<string, Product>();
  for (const product of existing) {
    for (const variant of product.variants) {
      existingSkuToProduct.set(variant.sku.toLowerCase(), product);
    }
  }

  for (const record of records) {
    const line = record.line;
    const get = (key: string) => (record.values[key] ?? "").trim();

    const sku = get("sku");
    const title = get("title");
    const category = get("category");
    const color = get("color");
    const size = get("size");
    const priceRaw = get("price_pkr");
    const stockRaw = get("stock");
    const slug = get("slug") || slugify(title);
    const subtitle = get("subtitle") || title;
    const description = get("description") || subtitle;
    const statusRaw = (get("status") || "draft").toLowerCase();
    const colorHex = get("color_hex") || "#333333";
    const saleRaw = get("sale_price_pkr");
    const imageSrc = get("image_src");
    const imageAlt = get("image_alt") || title;
    const collections = splitList(get("collections"));
    const features = splitList(get("features"));
    const featured = parseBool(get("featured"));
    const isNew = parseBool(get("is_new"));

    const rowErrors: CsvRowError[] = [];
    if (!sku) rowErrors.push({ line, field: "sku", message: "SKU is required." });
    if (!title || title.length < 2) rowErrors.push({ line, field: "title", message: "Title is required." });
    if (!category) rowErrors.push({ line, field: "category", message: "Category slug is required." });
    if (!color) rowErrors.push({ line, field: "color", message: "Color is required." });
    if (!size) rowErrors.push({ line, field: "size", message: "Size is required." });
    if (!slug) rowErrors.push({ line, field: "slug", message: "Could not derive a slug." });

    const pricePkr = Number(priceRaw);
    if (!Number.isInteger(pricePkr) || pricePkr <= 0) {
      rowErrors.push({ line, field: "price_pkr", message: "price_pkr must be a positive integer." });
    }
    const stock = Number(stockRaw);
    if (!Number.isInteger(stock) || stock < 0) {
      rowErrors.push({ line, field: "stock", message: "stock must be an integer ≥ 0." });
    }
    let salePricePkr: number | undefined;
    if (saleRaw) {
      salePricePkr = Number(saleRaw);
      if (!Number.isInteger(salePricePkr) || salePricePkr <= 0) {
        rowErrors.push({ line, field: "sale_price_pkr", message: "sale_price_pkr must be a positive integer." });
      }
    }
    if (!["draft", "published", "archived"].includes(statusRaw)) {
      rowErrors.push({ line, field: "status", message: "status must be draft, published, or archived." });
    }
    if (imageSrc && !/^https?:\/\//i.test(imageSrc)) {
      rowErrors.push({ line, field: "image_src", message: "image_src must be an http(s) URL." });
    }
    if (sku && seenSkus.has(sku.toLowerCase())) {
      rowErrors.push({ line, field: "sku", message: `Duplicate SKU "${sku}" in this file.` });
    }
    if (sku) seenSkus.add(sku.toLowerCase());

    if (rowErrors.length) {
      errors.push(...rowErrors);
      continue;
    }

    rows.push({
      line,
      sku,
      title,
      slug,
      subtitle,
      description,
      category,
      collections,
      status: statusRaw as ProductStatus,
      color,
      colorHex,
      size,
      pricePkr,
      salePricePkr,
      stock,
      imageSrc,
      imageAlt,
      featured,
      isNew,
      features,
    });
  }

  const bySlug = new Map<string, CsvImportRow[]>();
  for (const row of rows) {
    const list = bySlug.get(row.slug) ?? [];
    list.push(row);
    bySlug.set(row.slug, list);
  }

  const preview: CsvProductPreview[] = [];
  for (const [slug, group] of bySlug) {
    const existingBySlug = existing.find((product) => product.slug === slug);
    const existingBySku = group
      .map((row) => existingSkuToProduct.get(row.sku.toLowerCase()))
      .find(Boolean);
    const match = existingBySlug ?? existingBySku;
    if (match && existingBySlug && existingBySku && existingBySlug.id !== existingBySku.id) {
      errors.push({
        line: group[0]!.line,
        message: `Slug "${slug}" and SKUs resolve to different existing products.`,
      });
      continue;
    }
    for (const row of group) {
      if (!row.imageSrc && !match?.images?.[0]?.src) {
        errors.push({
          line: row.line,
          field: "image_src",
          message: "image_src is required when creating a new product (or updating one with no images).",
        });
      }
    }
    preview.push({
      action: match ? "update" : "create",
      productId: match?.id ?? slug,
      slug,
      title: group[0]!.title,
      variantCount: group.length,
      skus: group.map((row) => row.sku),
    });
  }

  return { rows, errors, preview: errors.length ? [] : preview };
}

export function buildProductsFromCsv(
  rows: CsvImportRow[],
  existing: Product[],
): { products: Product[]; created: number; updated: number } {
  const bySlug = new Map<string, CsvImportRow[]>();
  for (const row of rows) {
    const list = bySlug.get(row.slug) ?? [];
    list.push(row);
    bySlug.set(row.slug, list);
  }

  const products: Product[] = [];
  let created = 0;
  let updated = 0;

  for (const [slug, group] of bySlug) {
    const head = group[0]!;
    const existingBySlug = existing.find((product) => product.slug === slug);
    const existingBySku = existing.find((product) =>
      product.variants.some((variant) =>
        group.some((row) => row.sku.toLowerCase() === variant.sku.toLowerCase()),
      ),
    );
    const match = existingBySlug ?? existingBySku;
    const productId = match?.id ?? (slugify(slug) || `prd-${slug}`);

    const variants: ProductVariant[] = group.map((row) => {
      const prior = match?.variants.find((variant) => variant.sku.toLowerCase() === row.sku.toLowerCase());
      return {
        id: prior?.id ?? `${productId}-${slugify(row.color)}-${slugify(row.size)}`,
        sku: row.sku,
        color: row.color,
        colorHex: row.colorHex,
        size: row.size,
        pricePkr: row.pricePkr,
        salePricePkr: row.salePricePkr,
        stock: row.stock,
      };
    });

    // Keep unmatched existing variants when updating (partial CSV import).
    if (match) {
      for (const variant of match.variants) {
        if (!variants.some((item) => item.sku.toLowerCase() === variant.sku.toLowerCase())) {
          variants.push(variant);
        }
      }
    }

    const imageSrc = head.imageSrc || match?.images[0]?.src || "";
    const images = imageSrc
      ? [{ src: imageSrc, alt: head.imageAlt || head.title }]
      : match?.images ?? [];

    const product: Product = {
      id: productId,
      slug,
      title: head.title,
      subtitle: head.subtitle,
      description: head.description,
      features: head.features.length ? head.features : match?.features ?? [],
      specs: match?.specs ?? [],
      category: head.category,
      collections: head.collections.length ? head.collections : match?.collections ?? [],
      images,
      variants,
      featured: head.featured,
      isNew: head.isNew,
      status: head.status,
    };
    products.push(product);
    if (match) updated += 1;
    else created += 1;
  }

  return { products, created, updated };
}

export function productsToCsv(products: Product[]) {
  const headers = [
    "sku",
    "title",
    "slug",
    "subtitle",
    "description",
    "category",
    "collections",
    "status",
    "color",
    "color_hex",
    "size",
    "price_pkr",
    "sale_price_pkr",
    "stock",
    "image_src",
    "image_alt",
    "featured",
    "is_new",
    "features",
  ];
  const lines = [headers.join(",")];
  for (const product of products) {
    const image = product.images[0];
    for (const variant of product.variants) {
      const cells = [
        variant.sku,
        product.title,
        product.slug,
        product.subtitle,
        product.description,
        product.category,
        product.collections.join("|"),
        product.status ?? "published",
        variant.color,
        variant.colorHex,
        variant.size,
        String(variant.pricePkr),
        variant.salePricePkr != null ? String(variant.salePricePkr) : "",
        String(variant.stock),
        image?.src ?? "",
        image?.alt ?? "",
        product.featured ? "true" : "false",
        product.isNew ? "true" : "false",
        product.features.join("|"),
      ];
      lines.push(cells.map(escapeCsv).join(","));
    }
  }
  return `${lines.join("\n")}\n`;
}

function parseCsvTable(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  const parseErrors: CsvRowError[] = [];
  if (lines.length === 0) {
    return { headers: [] as string[], records: [] as { line: number; values: Record<string, string> }[], parseErrors };
  }
  const headers = splitCsvLine(lines[0]!).map((header) => normalizeHeader(header));
  const records: { line: number; values: Record<string, string> }[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const lineNo = i + 1;
    try {
      const cells = splitCsvLine(lines[i]!);
      const values: Record<string, string> = {};
      headers.forEach((header, index) => {
        values[header] = cells[index] ?? "";
      });
      records.push({ line: lineNo, values });
    } catch (error) {
      parseErrors.push({
        line: lineNo,
        message: error instanceof Error ? error.message : "Could not parse CSV row.",
      });
    }
  }
  return { headers, records, parseErrors };
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function splitList(value: string) {
  if (!value) return [];
  return value
    .split(/[|,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseBool(value: string) {
  if (!value) return false;
  return ["1", "true", "yes", "y"].includes(value.toLowerCase());
}

function escapeCsv(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}
