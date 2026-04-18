import "server-only";

import { defaultWeights } from "@/lib/data";
import { RecommendationKey, Weights } from "@/lib/types";
import { getRequestById } from "@/lib/server/request-repository";
import { RunProcurementAssessmentTool } from "@/skills/tools/RunProcurementAssessmentTool";
import { SimulateSupplierNegotiationTool } from "@/skills/tools/SimulateSupplierNegotiationTool";
import { SystemHealthCheckTool } from "@/skills/tools/SystemHealthCheckTool";
import { ValidateProcurementRequestTool } from "@/skills/tools/ValidateProcurementRequestTool";

const validateTool = new ValidateProcurementRequestTool();
const runAssessmentTool = new RunProcurementAssessmentTool();
const negotiationTool = new SimulateSupplierNegotiationTool();
const healthCheckTool = new SystemHealthCheckTool();

export async function assessRequestById(
  requestId: string,
  weights?: Partial<Weights>,
) {
  const request = getRequestById(requestId);

  if (!request) {
    throw new Error(`Request "${requestId}" was not found.`);
  }

  await validateTool.execute(request);

  return runAssessmentTool.execute({
    request,
    weights: {
      ...defaultWeights,
      ...(weights ?? {}),
    },
  });
}

export async function getLuaAgentHealth() {
  return healthCheckTool.execute();
}

export async function negotiateRecommendationByRequestId(
  requestId: string,
  recommendationKey: RecommendationKey,
  weights?: Partial<Weights>,
) {
  const request = getRequestById(requestId);

  if (!request) {
    throw new Error(`Request "${requestId}" was not found.`);
  }

  await validateTool.execute(request);

  const mergedWeights = {
    ...defaultWeights,
    ...(weights ?? {}),
  };

  const assessment = await runAssessmentTool.execute({
    request,
    weights: mergedWeights,
  });
  const recommendation = assessment.recommendations[recommendationKey];

  if (!recommendation) {
    throw new Error(`Recommendation "${recommendationKey}" was not found.`);
  }

  const negotiation = await negotiationTool.execute({
    request,
    supplierId: recommendation.supplier.supplierId,
    recommendationKey,
    recommendationLabel: recommendation.label,
    weights: mergedWeights,
  });

  return {
    request,
    recommendation,
    negotiation,
  };
}
