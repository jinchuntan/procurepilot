import { LuaTool } from "lua-cli";
import { defaultWeights } from "@/lib/data";
import { storedRequestSchema, weightsSchema } from "@/lib/procurement-schemas";
import { buildProcurementAssessment } from "@/lib/scoring";
import { z } from "zod";

const toolInputSchema = z.object({
  request: storedRequestSchema,
  weights: weightsSchema.partial().optional(),
});

export class RunProcurementAssessmentTool implements LuaTool {
  name = "run_procurement_assessment";
  description =
    "Run the procurement agent to rank suppliers, explain the recommendation, and surface risk.";

  inputSchema = toolInputSchema;

  async execute(input: z.infer<typeof this.inputSchema>) {
    const parsed = toolInputSchema.parse(input);

    return buildProcurementAssessment(parsed.request, {
      ...defaultWeights,
      ...(parsed.weights ?? {}),
    });
  }
}
