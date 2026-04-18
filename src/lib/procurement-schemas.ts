import { z } from "zod";

export const weightsSchema = z.object({
  price: z.number().int().min(0).max(40),
  leadTime: z.number().int().min(0).max(40),
  reliability: z.number().int().min(0).max(40),
  stockAvailability: z.number().int().min(0).max(40),
  supplierRisk: z.number().int().min(0).max(40),
  urgencyFit: z.number().int().min(0).max(40),
});

const requestDraftBaseSchema = z.object({
  itemId: z.string().min(1).optional(),
  itemName: z.string().min(2).max(160).optional(),
  category: z
    .enum([
      "maintenance",
      "office supplies",
      "packaging",
      "chemicals",
      "spare parts",
      "electronics",
      "safety equipment",
    ])
    .optional(),
  quantity: z.coerce.number().int().positive("quantity must be greater than zero"),
  requiredBy: z.string().min(8, "requiredBy must be provided"),
  budgetMin: z.coerce.number().min(0),
  budgetMax: z.coerce.number().min(0),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  minSupplierRating: z.coerce.number().int().min(60).max(99),
  notes: z.string().max(2000).default(""),
});

export const requestDraftSchema = requestDraftBaseSchema.superRefine((value, context) => {
    if (!value.itemId && !value.itemName) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["itemName"],
        message: "Either itemId or itemName must be provided",
      });
    }

    if (value.budgetMin > value.budgetMax) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["budgetMax"],
        message: "budgetMax must be greater than or equal to budgetMin",
      });
    }
  });

export const storedRequestSchema = requestDraftBaseSchema.extend({
  itemId: z.string().min(1),
  id: z.string().min(1),
  itemName: z.string().min(1),
  category: z.enum([
    "maintenance",
    "office supplies",
    "packaging",
    "chemicals",
    "spare parts",
    "electronics",
    "safety equipment",
  ]),
  createdAt: z.string().min(1),
});

export const assessmentRouteSchema = z.object({
  requestId: z.string().min(1),
  weights: weightsSchema.partial().optional(),
});
