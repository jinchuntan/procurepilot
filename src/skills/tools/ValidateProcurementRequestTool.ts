import { LuaTool } from "lua-cli";
import { getItemById } from "@/lib/data";
import { storedRequestSchema } from "@/lib/procurement-schemas";
import { daysUntil } from "@/lib/scoring";
import { z } from "zod";

export class ValidateProcurementRequestTool implements LuaTool {
  name = "validate_procurement_request";
  description =
    "Validate a procurement request before the agent runs supplier analysis.";

  inputSchema = storedRequestSchema;

  async execute(input: z.infer<typeof this.inputSchema>) {
    const request = storedRequestSchema.parse(input);
    const item = getItemById(request.itemId);
    const warnings: string[] = [];

    if (!item) {
      warnings.push(
        `Custom sourcing brief detected for "${request.itemName}". ProcurePilot will benchmark it against the closest supported category profile.`,
      );
    } else if (request.category !== item.category) {
      warnings.push(
        `Stored category "${request.category}" does not match the catalog category "${item.category}".`,
      );
    }

    if (daysUntil(request.requiredBy) === 0) {
      warnings.push("Required-by date is same-day. Only the fastest suppliers are likely to fit.");
    }

    return {
      status: "ok" as const,
      request,
      warnings,
    };
  }
}
