export const site = {
  name: "GarmentLoop",
  tagline: "Premium winter apparel, engineered for comfort.",
  description:
    "GarmentLoop is a premium winter apparel house. Shop jackets, knitwear, and essentials designed for warmth, durability, and everyday style — with cash on delivery across Pakistan.",
  url: "https://garmentloop.store",
  email: "hello@garmentloop.store",
  phone: "+92 300 1234567",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "923001234567",
  address: "Lahore, Pakistan",
  freeShippingThresholdPkr: 8000,
  domesticShippingPkr: 300,
  internationalShippingPkr: 7000,
  usdRate: 278,
} as const;

export const pakistanCities = [
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Peshawar",
  "Quetta",
  "Multan",
  "Hyderabad",
  "Sialkot",
  "Gujranwala",
  "Bahawalpur",
] as const;

export const countries = [
  { code: "PK", name: "Pakistan" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
] as const;
