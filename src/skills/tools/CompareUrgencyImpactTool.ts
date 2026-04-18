import { LuaTool } from "lua-cli";
import { defaultWeights } from "@/lib/data";
import { storedRequestSchema, weightsSchema } from "@/lib/procurement-schemas";
import { buildUrgencyComparison, scoreQuotesForRequest } from "@/lib/scoring";
import { z } from "zod";

const toolInputSchema = z.object({
  request: storedRequestSchema,
  weights: weightsSchema.partial().optional(),
});

export class CompareUrgencyImpactTool implements LuaTool {
  name = "compare_urgency_impact";
  description =
    "Show how the top supplier changes when the same procurement need becomes more urgent.";

  inputSchema = toolInputSchema;

  async execute(input: z.infer<typeof this.inputSchema>) {
    const parsed = toolInputSchema.parse(input);
    const weights = {
      ...defaultWeights,
      ...(parsed.weights ?? {}),
    };
    const currentQuotes = scoreQuotesForRequest(parsed.request, weights);

    return buildUrgencyComparison(parsed.request, weights, currentQuotes);
  }
}
