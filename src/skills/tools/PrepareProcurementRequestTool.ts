import { LuaTool } from "lua-cli";
import { prepareRequestFromItem } from "@/lib/catalog-search";
import { z } from "zod";

export class PrepareProcurementRequestTool implements LuaTool {
  name = "prepare_procurement_request";
  description =
    "Build a normalized procurement request from a catalog item and partial user requirements without saving it.";

  inputSchema = z.object({
    itemId: z.string().min(1),
    quantity: z.number().int().positive().optional(),
    requiredBy: z.string().optional(),
    daysUntilRequired: z.number().int().min(0).max(90).optional(),
    budgetMin: z.number().min(0).optional(),
    budgetMax: z.number().min(0).optional(),
    priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
    minSupplierRating: z.number().int().min(60).max(99).optional(),
    notes: z.string().max(2000).optional(),
  });

  async execute(input: z.infer<typeof this.inputSchema>) {
    const parsed = this.inputSchema.parse(input);
    const request = prepareRequestFromItem(parsed);

    return {
      request,
      assumptions: {
        usedDefaultQuantity: parsed.quantity === undefined,
        usedDefaultBudget: parsed.budgetMin === undefined || parsed.budgetMax === undefined,
        usedDefaultRequiredBy:
          parsed.requiredBy === undefined && parsed.daysUntilRequired === undefined,
      },
    };
  }
}
