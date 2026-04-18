import { LuaTool } from "lua-cli";
import { simulateSupplierNegotiation } from "@/lib/negotiation";
import { storedRequestSchema } from "@/lib/procurement-schemas";
import { scoreQuotesForRequest } from "@/lib/scoring";
import { weightsSchema } from "@/lib/procurement-schemas";
import { z } from "zod";

const toolInputSchema = z.object({
  request: storedRequestSchema,
  supplierId: z.string().min(1),
  recommendationKey: z.enum(["overall", "lowCost", "fastest", "balanced"]),
  recommendationLabel: z.string().min(1),
  weights: weightsSchema.partial().optional(),
});

export class SimulateSupplierNegotiationTool implements LuaTool {
  name = "simulate_supplier_negotiation";
  description =
    "Negotiate with a supplier sandbox account to improve price or delivery terms for a shortlisted recommendation.";

  inputSchema = toolInputSchema;

  async execute(input: z.infer<typeof this.inputSchema>) {
    const parsed = toolInputSchema.parse(input);
    const quote = scoreQuotesForRequest(parsed.request, {
      price: 24,
      leadTime: 22,
      reliability: 20,
      stockAvailability: 14,
      supplierRisk: 12,
      urgencyFit: 8,
      ...(parsed.weights ?? {}),
    }).find((entry) => entry.supplierId === parsed.supplierId);

    if (!quote) {
      throw new Error(`Supplier "${parsed.supplierId}" is not available for this request.`);
    }

    return simulateSupplierNegotiation(
      parsed.request,
      quote,
      parsed.recommendationKey,
      parsed.recommendationLabel,
    );
  }
}
