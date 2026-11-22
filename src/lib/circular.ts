import type { CircularPlanId } from "@/lib/commerce-types";

export type CircularPlan = {
  id: CircularPlanId;
  name: string;
  tagline: string;
  description: string;
  pricePkr: number;
  billingInterval: "month" | "year";
  perks: string[];
  /** Optional Stripe Price ID override from env */
  stripePriceEnv: string;
};

export const CIRCULAR_PLANS: CircularPlan[] = [
  {
    id: "care",
    name: "Care Loop",
    tagline: "Seasonal care kit + guides",
    description:
      "Seasonal fabric care kit, private care guides, and priority WhatsApp advice so pieces stay in rotation longer.",
    pricePkr: 1490,
    billingInterval: "month",
    perks: ["Seasonal care kit", "Private care guides", "Priority size & care advice"],
    stripePriceEnv: "STRIPE_PRICE_CARE_MONTHLY",
  },
  {
    id: "repair_plus",
    name: "Repair+",
    tagline: "Two atelier repairs each year",
    description:
      "Two included repair bookings per year, discounted materials, and booked atelier slots with status tracking.",
    pricePkr: 3490,
    billingInterval: "month",
    perks: ["2 repair bookings / year", "Member material rates", "Booked atelier slots"],
    stripePriceEnv: "STRIPE_PRICE_REPAIR_PLUS_MONTHLY",
  },
  {
    id: "recycle_loop",
    name: "Recycle Loop",
    tagline: "Take-back credit + recycling",
    description:
      "Priority take-back scheduling, store credit estimates, and responsible recycling when a piece cannot be refreshed.",
    pricePkr: 2490,
    billingInterval: "month",
    perks: ["Priority take-back pickup", "Credit estimate on intake", "Responsible recycling path"],
    stripePriceEnv: "STRIPE_PRICE_RECYCLE_LOOP_MONTHLY",
  },
];

export function getCircularPlan(planId: CircularPlanId) {
  return CIRCULAR_PLANS.find((plan) => plan.id === planId);
}

/** Force mock subscriptions even when Stripe keys exist. */
export function circularSubscriptionsMockForced() {
  const value = process.env.CIRCULAR_SUBSCRIPTIONS_MOCK?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function stripePriceIdForPlan(plan: CircularPlan) {
  const id = process.env[plan.stripePriceEnv]?.trim();
  return id || undefined;
}
