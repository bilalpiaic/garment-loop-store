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
};

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
  {
    id: "down-vest",
    slug: "ridge-down-vest",
    title: "Ridge Down Vest",
    subtitle: "Core warmth, free arms",
    description:
      "A compact down vest for days when a full jacket is too much. Wear it over a crewneck for errands, or under a coat on mountain drives.",
    features: [
      "700-fill down, baffled construction",
      "Stand collar and two-way zipper",
      "Hand-warmer pockets with snap flaps",
    ],
    specs: [
      { label: "Fill", value: "Recycled down, 700 fill" },
      { label: "Shell", value: "Ripstop nylon" },
      { label: "Care", value: "Professional wash" },
    ],
    category: "jackets",
    collections: ["new-arrivals"],
    isNew: true,
    images: [
      {
        src: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1400&q=80",
        alt: "Down vest",
      },
      {
        src: "https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?auto=format&fit=crop&w=1400&q=80",
        alt: "Layered winter vest look",
      },
    ],
    variants: variants(
      "down-vest",
      [
        { color: "Black", hex: "#161616" },
        { color: "Navy", hex: "#24344d" },
      ],
      ["S", "M", "L", "XL"],
      9900,
      {},
    ),
  },
  {
    id: "merino-crewneck",
    slug: "merino-wool-crewneck",
    title: "Merino Wool Crewneck",
    subtitle: "Fine-gauge everyday knit",
    description:
      "A fine merino crewneck that regulates temperature and resists odor. The knit is close without clinging — the layer you keep on from desk to dinner.",
    features: [
      "18.5-micron merino wool",
      "Ribbed neck, cuffs, and hem",
      "Naturally odor-resistant",
      "Works as a base or mid layer",
    ],
    specs: [
      { label: "Fabric", value: "100% merino wool" },
      { label: "Gauge", value: "Fine 12-gauge" },
      { label: "Care", value: "Hand wash cold, lay flat" },
    ],
    category: "knitwear",
    collections: ["winter-collection", "essentials"],
    featured: true,
    images: [
      {
        src: "https://images.unsplash.com/photo-1631541909061-71e349d1f203?auto=format&fit=crop&w=1400&q=80",
        alt: "Cream merino crewneck sweater",
      },
      {
        src: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=1400&q=80",
        alt: "Folded knit sweater",
      },
    ],
    variants: variants(
      "merino-crewneck",
      [
        { color: "Cream", hex: "#efe6d6" },
        { color: "Charcoal", hex: "#3a3a3a" },
        { color: "Forest", hex: "#2f4735" },
      ],
      ["S", "M", "L", "XL"],
      8900,
      { "Cream-M": 9 },
      6900,
    ),
  },
  {
    id: "fleece-hoodie",
    slug: "thermal-fleece-hoodie",
    title: "Thermal Fleece Hoodie",
    subtitle: "Brushed inside, clean outside",
    description:
      "A quiet hoodie in dense fleece — no logos, no drawstring clatter. The interior is brushed for warmth; the exterior stays neat enough for weekend travel.",
    features: [
      "Double-sided fleece",
      "Kangaroo pocket and ribbed cuffs",
      "Unlined hood that sits flat",
    ],
    specs: [
      { label: "Fabric", value: "280 GSM polyester fleece" },
      { label: "Care", value: "Machine wash cold" },
    ],
    category: "knitwear",
    collections: ["essentials"],
    images: [
      {
        src: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1400&q=80",
        alt: "Grey fleece hoodie",
      },
      {
        src: "https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=1400&q=80",
        alt: "Hoodie on a hanger",
      },
    ],
    variants: variants(
      "fleece-hoodie",
      [
        { color: "Heather Grey", hex: "#b7b7b7" },
        { color: "Navy", hex: "#1d2a40" },
        { color: "Black", hex: "#1a1a1a" },
      ],
      ["S", "M", "L", "XL"],
      6900,
      { "Black-XL": 0 },
    ),
  },
  {
    id: "sherpa-shirt-jacket",
    slug: "sherpa-lined-shirt-jacket",
    title: "Sherpa Lined Shirt Jacket",
    subtitle: "Twil outer, sherpa inner",
    description:
      "A shirt-jacket with a cotton twill face and a sherpa lining. Snap through as a shirt on mild days, or close it as a jacket when the evening cools.",
    features: [
      "Cotton twill outer",
      "Sherpa lining through body and collar",
      "Chest pockets with flaps",
    ],
    specs: [
      { label: "Outer", value: "Cotton twill" },
      { label: "Lining", value: "Polyester sherpa" },
      { label: "Care", value: "Machine wash cold, hang dry" },
    ],
    category: "jackets",
    collections: ["new-arrivals"],
    isNew: true,
    images: [
      {
        src: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=1400&q=80",
        alt: "Shirt jacket",
      },
      {
        src: "https://images.unsplash.com/photo-1542060748-10c28b62716f?auto=format&fit=crop&w=1400&q=80",
        alt: "Casual jacket on a rack",
      },
    ],
    variants: variants(
      "sherpa-shirt-jacket",
      [
        { color: "Olive", hex: "#6b6a4a" },
        { color: "Brown", hex: "#6a4b35" },
      ],
      ["S", "M", "L"],
      10900,
      {},
    ),
  },
  {
    id: "thermal-set",
    slug: "thermal-base-layer-set",
    title: "Thermal Base Layer Set",
    subtitle: "Top and bottom, merino blend",
    description:
      "A two-piece base layer in a merino blend that sits smoothly under knits and trousers. Wicks moisture, holds heat, and stays comfortable through long days outdoors.",
    features: [
      "Merino-blend jersey",
      "Flatlock seams",
      "Includes long-sleeve top and leggings",
    ],
    specs: [
      { label: "Fabric", value: "60% merino, 40% nylon" },
      { label: "Care", value: "Machine wash cold, lay flat" },
    ],
    category: "knitwear",
    collections: ["essentials"],
    images: [
      {
        src: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1400&q=80",
        alt: "Thermal base layer",
      },
      {
        src: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1400&q=80",
        alt: "White long sleeve layer",
      },
    ],
    variants: variants(
      "thermal-set",
      [
        { color: "Black", hex: "#202020" },
        { color: "Grey", hex: "#8a8a8a" },
      ],
      ["S", "M", "L", "XL"],
      4500,
      {},
    ),
  },
  {
    id: "wool-trousers",
    slug: "winter-wool-trousers",
    title: "Winter Wool Trousers",
    subtitle: "Pressed front, flannel hand",
    description:
      "Mid-weight wool trousers with a soft flannel hand. Tapered without being skinny, with enough drape to wear with a crewneck or under a long coat.",
    features: [
      "Wool flannel with slight stretch",
      "Hook-and-bar closure, zip fly",
      "Two rear pockets, one coin pocket",
    ],
    specs: [
      { label: "Fabric", value: "97% wool, 3% elastane" },
      { label: "Rise", value: "Mid" },
      { label: "Care", value: "Dry clean recommended" },
    ],
    category: "trousers",
    collections: ["winter-collection", "essentials"],
    images: [
      {
        src: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=1400&q=80",
        alt: "Wool trousers",
      },
      {
        src: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=1400&q=80",
        alt: "Tailored trousers detail",
      },
    ],
    variants: variants(
      "wool-trousers",
      [
        { color: "Charcoal", hex: "#454545" },
        { color: "Navy", hex: "#2a3550" },
        { color: "Brown", hex: "#5c4636" },
      ],
      ["30", "32", "34", "36"],
      7900,
      { "Navy-30": 2 },
    ),
  },
  {
    id: "cashmere-scarf",
    slug: "cashmere-blend-scarf",
    title: "Cashmere Blend Scarf",
    subtitle: "Oversized, brushed finish",
    description:
      "A generous scarf in a cashmere-wool blend. Long enough to double wrap, light enough to wear indoors. The finish is brushed for a quiet halo of warmth.",
    features: [
      "Cashmere-wool blend",
      "200 × 70 cm",
      "Fringed ends, reversible weave",
    ],
    specs: [
      { label: "Fabric", value: "30% cashmere, 70% merino" },
      { label: "Size", value: "200 × 70 cm" },
      { label: "Care", value: "Hand wash cold" },
    ],
    category: "accessories",
    collections: ["winter-collection", "essentials"],
    images: [
      {
        src: "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&w=1400&q=80",
        alt: "Wool scarf",
      },
      {
        src: "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=1400&q=80",
        alt: "Soft knit accessory",
      },
    ],
    variants: variants(
      "cashmere-scarf",
      [
        { color: "Camel", hex: "#c2a06a" },
        { color: "Burgundy", hex: "#6e2c3a" },
        { color: "Grey", hex: "#9a9a9a" },
      ],
      ["One Size"],
      3900,
      {},
    ),
  },
  {
    id: "ribbed-beanie",
    slug: "ribbed-knit-beanie",
    title: "Ribbed Knit Beanie",
    subtitle: "Merino rib, no cuff bulk",
    description:
      "A close merino beanie with a deep rib that holds its shape. Wear it folded once; it will not slouch into your eyes on a windy platform.",
    features: [
      "Merino wool rib",
      "Double-layer brim",
      "Fits most adults",
    ],
    specs: [
      { label: "Fabric", value: "100% merino wool" },
      { label: "Care", value: "Hand wash cold" },
    ],
    category: "accessories",
    collections: ["essentials", "new-arrivals"],
    isNew: true,
    images: [
      {
        src: "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=1400&q=80",
        alt: "Knit beanie",
      },
      {
        src: "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&w=1400&q=80",
        alt: "Winter beanie lifestyle",
      },
    ],
    variants: variants(
      "ribbed-beanie",
      [
        { color: "Black", hex: "#1b1b1b" },
        { color: "Cream", hex: "#efe7d8" },
        { color: "Forest", hex: "#314a38" },
      ],
      ["One Size"],
      1900,
      {},
      1500,
    ),
  },
  {
    id: "leather-gloves",
    slug: "leather-winter-gloves",
    title: "Leather Winter Gloves",
    subtitle: "Lambskin with wool lining",
    description:
      "Slim lambskin gloves lined in wool. Touch-screen compatible at the index finger and thumb, with a snap wrist so they stay put on a motorcycle or bicycle.",
    features: [
      "Lambskin outer",
      "Wool lining",
      "Touch-screen fingertips",
    ],
    specs: [
      { label: "Outer", value: "Lambskin leather" },
      { label: "Lining", value: "Wool knit" },
      { label: "Care", value: "Leather conditioner, air dry" },
    ],
    category: "accessories",
    collections: ["winter-collection"],
    images: [
      {
        src: "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=1400&q=80",
        alt: "Leather gloves",
      },
      {
        src: "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?auto=format&fit=crop&w=1400&q=80",
        alt: "Winter gloves close up",
      },
    ],
    variants: variants(
      "leather-gloves",
      [
        { color: "Black", hex: "#1a1a1a" },
        { color: "Brown", hex: "#5a3d2b" },
      ],
      ["S", "M", "L"],
      2900,
      { "Brown-S": 3 },
    ),
  },
];

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getVariant(variantId: string) {
  for (const product of products) {
    const variant = product.variants.find((item) => item.id === variantId);
    if (variant) {
      return { product, variant };
    }
  }
  return null;
}

export function allVariants() {
  return products.flatMap((product) =>
    product.variants.map((variant) => ({ product, variant })),
  );
}

export function getCategory(slug: string) {
  return categories.find((category) => category.slug === slug);
}

export function getCollection(slug: string) {
  return collections.find((collection) => collection.slug === slug);
}

export function productsByCategory(slug: string) {
  return products.filter((product) => product.category === slug);
}

export function productsByCollection(slug: string) {
  return products.filter((product) => product.collections.includes(slug));
}

export function featuredProducts() {
  return products.filter((product) => product.featured);
}

export function relatedProducts(product: Product, limit = 4) {
  return products
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

export function searchProducts(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [];
  }
  return products.filter((product) => {
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

export function allSizes() {
  return [...new Set(products.flatMap((product) => product.variants.map((v) => v.size)))];
}

export function allColors() {
  return [...new Set(products.flatMap((product) => product.variants.map((v) => v.color)))];
}

export function filterProducts(options: {
  category?: string;
  collection?: string;
  color?: string;
  size?: string;
  minPrice?: number;
  maxPrice?: number;
  q?: string;
}) {
  return products.filter((product) => {
    if (options.category && product.category !== options.category) return false;
    if (options.collection && !product.collections.includes(options.collection)) return false;
    if (options.q) {
      const matches = searchProducts(options.q).some((item) => item.id === product.id);
      if (!matches) return false;
    }
    const variants = product.variants.filter((variant) => {
      if (options.color && variant.color !== options.color) return false;
      if (options.size && variant.size !== options.size) return false;
      const price = variant.salePricePkr ?? variant.pricePkr;
      if (options.minPrice !== undefined && price < options.minPrice) return false;
      if (options.maxPrice !== undefined && price > options.maxPrice) return false;
      return true;
    });
    return variants.length > 0;
  });
}
