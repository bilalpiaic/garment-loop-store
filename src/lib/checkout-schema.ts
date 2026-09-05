import { z } from "zod";

export const checkoutSchema = z
  .object({
    fullName: z.string().trim().min(3, "Enter your full name."),
    email: z.string().trim().email("Enter a valid email."),
    phone: z
      .string()
      .trim()
      .min(10, "Enter a valid phone number.")
      .regex(/^[+\d\s()-]{10,20}$/, "Enter a valid phone number."),
    country: z.string().min(2),
    city: z.string().trim().min(2, "Enter your city."),
    area: z.string().trim().min(2, "Enter your area or locality."),
    address: z.string().trim().min(8, "Enter a street address."),
    notes: z.string().optional(),
    paymentMethod: z.enum(["cod", "bank_transfer", "card_demo"]),
    currency: z.enum(["PKR", "USD"]),
    discountCode: z.string().trim().optional(),
    items: z
      .array(
        z.object({
          variantId: z.string().min(1),
          quantity: z.number().int().min(1),
        }),
      )
      .min(1, "Your cart is empty."),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === "cod" && data.country !== "PK") {
      ctx.addIssue({
        code: "custom",
        path: ["paymentMethod"],
        message: "Cash on delivery is available in Pakistan only.",
      });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
