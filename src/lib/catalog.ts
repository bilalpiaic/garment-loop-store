export type ProductImage = {
  src: string;
  alt: string;
};

export type ProductVariant = {
  id: string;
  sku: string;
  color: string;
  colorHex: string;
  size: string;
  pricePkr: number;
  salePricePkr?: number;
  stock: number;
};

export type ProductStatus = "draft" | "published" | "archived";

export type Product = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  specs: { label: string; value: string }[];
  category: string;
  collections: string[];
  images: ProductImage[];
  variants: ProductVariant[];
  featured?: boolean;
  isNew?: boolean;
  status?: ProductStatus;
};

export type CatalogData = {
  products: Product[];
  categories: Category[];
  collections: Collection[];
};

export function isPublished(product: Product) {
  return product.status !== "draft" && product.status !== "archived";
}

export type Category = {
  slug: string;
  name: string;
  description: string;
  image: string;
};

export type Collection = {
  slug: string;
  name: string;
  description: string;
  image: string;
};

export const categories: Category[] = [
  {
    slug: "jackets",
    name: "Jackets",
    description: "Puffers, bombers, and wool coats cut for cold mornings and late evenings.",
    image:
      "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=1400&q=80",
  },
  {
    slug: "knitwear",
    name: "Knitwear",
    description: "Merino, fleece, and thermal layers that hold warmth without bulk.",
    image:
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1400&q=80",
  },
  {
    slug: "trousers",
    name: "Trousers",
    description: "Winter-weight wool trousers tailored for movement and daily wear.",
    image:
      "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=1400&q=80",
  },
  {
    slug: "accessories",
    name: "Accessories",
    description: "Scarves, beanies, and gloves to finish a winter wardrobe.",
    image:
      "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&w=1400&q=80",
  },
];

export const collections: Collection[] = [
  {
    slug: "winter-collection",
    name: "Winter Collection",
    description: "The season’s core outerwear and knits, built for Pakistani winters and travel.",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80",
  },
  {
    slug: "new-arrivals",
    name: "New Arrivals",
    description: "Fresh cuts just added to the floor.",
    image:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80",
  },
  {
    slug: "essentials",
    name: "Essentials",
    description: "Everyday layers you will reach for from November through March.",
    image:
      "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1600&q=80",
  },
];

function variants(
  slug: string,
  colors: { color: string; hex: string }[],
  sizes: string[],
  pricePkr: number,
  stockMap: Record<string, number>,
  salePricePkr?: number,
): ProductVariant[] {
  return colors.flatMap(({ color, hex }) =>
    sizes.map((size) => {
      const id = `${slug}-${color.toLowerCase().replace(/\s+/g, "-")}-${size.toLowerCase()}`;
      const stockKey = `${color}-${size}`;
      return {
        id,
        sku: id.toUpperCase(),
        color,
        colorHex: hex,
        size,
        pricePkr,
        salePricePkr,
        stock: stockMap[stockKey] ?? 12,
      };
    }),
  );
}

export const products: Product[] = [
  {
    id: "alpine-puffer",
    slug: "alpine-puffer-jacket",
    title: "Alpine Puffer Jacket",
    subtitle: "700-fill warmth, city weight",
    description:
      "A refined puffer with a matte nylon shell and responsible down fill. Quilted to hold heat without looking bulky, with a high collar and hidden storm cuffs for windy commutes.",
    features: [
      "Water-resistant matte nylon shell",
      "700-fill recycled down insulation",
      "Two-way zipper and interior security pocket",
      "Packs into its own pocket for travel",
    ],
    specs: [
      { label: "Shell", value: "100% nylon" },
      { label: "Fill", value: "Recycled down, 700 fill power" },
      { label: "Care", value: "Dry clean or professional wash" },
      { label: "Origin", value: "Stitched in Pakistan" },
    ],
    category: "jackets",
    collections: ["winter-collection", "essentials"],
    featured: true,
    images: [
      {
        src: "https://images.unsplash.com/photo-1578932750294-f5075e85f44a?auto=format&fit=crop&w=1400&q=80",
        alt: "Black puffer jacket on a winter street",
      },
      {
        src: "https://images.unsplash.com/photo-1610652492500-ded49ceeb378?auto=format&fit=crop&w=1400&q=80",
        alt: "Person wearing a puffer jacket in cold weather",
      },
    ],
    variants: variants(
      "alpine-puffer",
      [
        { color: "Black", hex: "#1f1f1f" },
        { color: "Navy", hex: "#1c2e4a" },
        { color: "Olive", hex: "#4a5340" },
      ],
      ["S", "M", "L", "XL"],
      14900,
      { "Black-S": 3, "Olive-XL": 2 },
    ),
  },
  {
    id: "highland-overcoat",
    slug: "highland-wool-overcoat",
    title: "Highland Wool Overcoat",
    subtitle: "Italian-blend wool, full length",
    description:
      "A single-breasted overcoat in dense wool with a clean chest and a slightly longer hem. Structured enough for the office, warm enough for open-air markets in January.",
    features: [
      "Italian-blend wool outer",
      "Satin lining and notched lapel",
      "Interior pocket and buttoned cuffs",
      "Knee-length cut with back vent",
    ],
    specs: [
      { label: "Fabric", value: "80% wool, 20% polyamide" },
      { label: "Lining", value: "Viscose satin" },
      { label: "Care", value: "Dry clean only" },
      { label: "Fit", value: "Regular, tailored shoulder" },
    ],
    category: "jackets",
    collections: ["winter-collection"],
    featured: true,
    images: [
      {
        src: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=1400&q=80",
        alt: "Camel wool overcoat",
      },
      {
        src: "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?auto=format&fit=crop&w=1400&q=80",
        alt: "Wool coat worn outdoors",
      },
    ],
    variants: variants(
      "highland-overcoat",
      [
        { color: "Camel", hex: "#c4a574" },
        { color: "Charcoal", hex: "#3b3b3b" },
      ],
      ["S", "M", "L"],
      24900,
      { "Camel-S": 4, "Charcoal-L": 5 },
    ),
  },
  {
    id: "quilted-bomber",
    slug: "quilted-bomber-jacket",
    title: "Quilted Bomber Jacket",
    subtitle: "Lightweight layering piece",
    description:
      "A diamond-quilt bomber that sits between a shirt and a coat. Wear it over merino in Lahore’s dry cold, or under the overcoat when the temperature drops further north.",
    features: [
      "Diamond quilt construction",
      "Ribbed collar, cuffs, and hem",
      "YKK zipper and welt pockets",
      "Light insulation for 10–18°C days",
    ],
    specs: [
      { label: "Shell", value: "Nylon with DWR finish" },
      { label: "Fill", value: "Synthetic insulation" },
      { label: "Care", value: "Machine wash cold, hang dry" },
    ],
    category: "jackets",
    collections: ["winter-collection", "new-arrivals"],
    featured: true,
    images: [
      {
        src: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=1400&q=80",
        alt: "Quilted bomber jacket",
      },
      {
        src: "https://images.unsplash.com/photo-1520975661595-6453be3f7070?auto=format&fit=crop&w=1400&q=80",
        alt: "Bomber jacket detail",
      },
    ],
    variants: variants(
      "quilted-bomber",
      [
        { color: "Black", hex: "#111111" },
        { color: "Olive", hex: "#55614a" },
      ],
      ["S", "M", "L", "XL"],
      12900,
      { "Black-M": 14, "Olive-S": 1 },
    ),
  },
];

export function getProductBySlug(slug: string, list: Product[] = products) {
  return list.find((product) => product.slug === slug);
}

export function getVariant(variantId: string, list: Product[] = products) {
  for (const product of list) {
    const variant = product.variants.find((item) => item.id === variantId);
    if (variant) {
      return { product, variant };
    }
  }
  return null;
}

export function allVariants(list: Product[] = products) {
  return list.flatMap((product) =>
    product.variants.map((variant) => ({ product, variant })),
  );
}

export function getCategory(slug: string, list: Category[] = categories) {
  return list.find((category) => category.slug === slug);
}

export function getCollection(slug: string, list: Collection[] = collections) {
  return list.find((collection) => collection.slug === slug);
}

export function productsByCategory(slug: string, list: Product[] = products) {
  return list.filter((product) => product.category === slug);
}

export function productsByCollection(slug: string, list: Product[] = products) {
  return list.filter((product) => product.collections.includes(slug));
}

export function featuredProducts(list: Product[] = products) {
  return list.filter((product) => product.featured);
}

export function relatedProducts(product: Product, limit = 4, list: Product[] = products) {
  return list
    .filter((item) => item.id !== product.id && item.category === product.category)
    .slice(0, limit);
}

export function uniqueColors(product: Product) {
  const seen = new Map<string, string>();
  for (const variant of product.variants) {
    if (!seen.has(variant.color)) {
      seen.set(variant.color, variant.colorHex);
    }
  }
  return [...seen.entries()].map(([color, hex]) => ({ color, hex }));
}

export function uniqueSizes(product: Product) {
  return [...new Set(product.variants.map((variant) => variant.size))];
}

export function lowestPrice(product: Product) {
  return Math.min(
    ...product.variants.map((variant) => variant.salePricePkr ?? variant.pricePkr),
  );
}

export function comparePrice(product: Product) {
  const hasSale = product.variants.some((variant) => variant.salePricePkr);
  if (!hasSale) {
    return undefined;
  }
  return Math.min(...product.variants.map((variant) => variant.pricePkr));
}

export function searchProducts(query: string, list: Product[] = products) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [];
  }
  return list.filter((product) => {
    const haystack = [
      product.title,
      product.subtitle,
      product.description,
      product.category,
      ...product.collections,
      ...product.variants.map((variant) => variant.color),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function allSizes(list: Product[] = products) {
  return [...new Set(list.flatMap((product) => product.variants.map((v) => v.size)))];
}

export function allColors(list: Product[] = products) {
  return [...new Set(list.flatMap((product) => product.variants.map((v) => v.color)))];
}

function splitFacet(value?: string) {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function filterProducts(
  options: {
    category?: string;
    collection?: string;
    color?: string;
    size?: string;
    minPrice?: number;
    maxPrice?: number;
    q?: string;
    sort?: string;
  },
  list: Product[] = products,
) {
  const colors = splitFacet(options.color);
  const sizes = splitFacet(options.size);
  const categories = splitFacet(options.category);

  const filtered = list.filter((product) => {
    if (categories.length && !categories.includes(product.category)) return false;
    if (options.collection && !product.collections.includes(options.collection)) return false;
    if (options.q) {
      const matches = searchProducts(options.q, list).some((item) => item.id === product.id);
      if (!matches) return false;
    }
    const variants = product.variants.filter((variant) => {
      if (colors.length && !colors.includes(variant.color)) return false;
      if (sizes.length && !sizes.includes(variant.size)) return false;
      const price = variant.salePricePkr ?? variant.pricePkr;
      if (options.minPrice !== undefined && price < options.minPrice) return false;
      if (options.maxPrice !== undefined && price > options.maxPrice) return false;
      return true;
    });
    return variants.length > 0;
  });

  if (options.sort === "price-asc") {
    return [...filtered].sort((a, b) => lowestPrice(a) - lowestPrice(b));
  }
  if (options.sort === "price-desc") {
    return [...filtered].sort((a, b) => lowestPrice(b) - lowestPrice(a));
  }
  if (options.sort === "newest") {
    return [...filtered].sort((a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)));
  }
  return filtered;
}
