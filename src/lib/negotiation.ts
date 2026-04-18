import { ProcurementRequest, RecommendationKey, ScoredSupplierQuote, NegotiationResult } from "@/lib/types";

function roundCurrency(value: number) {
  return Math.round(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildSandboxAccount(supplierId: string) {
  return `${supplierId}@sandbox.procurepilot.ai`;
}

export function simulateSupplierNegotiation(
  request: ProcurementRequest,
  quote: ScoredSupplierQuote,
  recommendationKey: RecommendationKey,
  recommendationLabel: string,
) {
  const budgetPressure = quote.totalCost > request.budgetMax ? 1.6 : 0.8;
  const quantityLeverage = request.quantity >= quote.moq * 3 ? 1.1 : 0.5;
  const stockLeverage = quote.stockAvailability >= 60 ? 0.9 : 0.3;
  const confidenceLeverage = quote.deliveryConfidence >= 90 ? 0.6 : 0.25;
  const urgencyPenalty = request.priority === "Critical" ? 0.5 : request.priority === "High" ? 0.25 : 0;
  const recommendationAdjustment =
    recommendationKey === "lowCost"
      ? -0.4
      : recommendationKey === "fastest"
        ? -0.15
        : recommendationKey === "balanced"
          ? 0.2
          : 0.35;

  const concessionPercent = clamp(
    budgetPressure +
      quantityLeverage +
      stockLeverage +
      confidenceLeverage +
      recommendationAdjustment -
      urgencyPenalty,
    1.4,
    6.8,
  );

  const negotiatedUnitPrice = roundCurrency(
    quote.unitPrice * (1 - concessionPercent / 100),
  );
  const negotiatedTotalCost = negotiatedUnitPrice * request.quantity;
  const leadTimeImprovement =
    request.priority === "Critical" || request.priority === "High"
      ? quote.stockAvailability >= 60 && quote.deliveryConfidence >= 86
        ? 1
        : 0
      : 0;
  const negotiatedLeadTimeDays = Math.max(1, quote.leadTimeDays - leadTimeImprovement);
  const savings = Math.max(0, quote.totalCost - negotiatedTotalCost);
  const savingsPercent = Number(((savings / Math.max(quote.totalCost, 1)) * 100).toFixed(1));

  const termsWon = [
    savings > 0 ? `Price reduced by ${savingsPercent}%` : "Price held at current quote",
    negotiatedLeadTimeDays < quote.leadTimeDays
      ? `Priority dispatch improved lead time to ${negotiatedLeadTimeDays} days`
      : `Lead time held at ${quote.leadTimeDays} days`,
    "Quote hold extended for 72 hours",
    quote.moq <= request.quantity
      ? "MOQ kept aligned with requested quantity"
      : `MOQ remains at ${quote.moq} units`,
  ];

  const summary = `ProcurePilot negotiated the ${recommendationLabel.toLowerCase()} with ${quote.supplierName} through a supplier sandbox account. The final offer moved from ${formatCurrency(
    quote.totalCost,
  )} to ${formatCurrency(negotiatedTotalCost)}, unlocking ${formatCurrency(
    savings,
  )} in savings while keeping delivery at ${negotiatedLeadTimeDays} days.`;

  const transcript = [
    {
      speaker: "ProcurePilot" as const,
      text: `We want to place ${request.quantity} units of ${request.itemName}. Can you sharpen the price while keeping the delivery window close to ${request.requiredBy}?`,
    },
    {
      speaker: "Supplier Desk" as const,
      text: `We can support the order from the sandbox sales desk. The starting quote is ${formatCurrency(
        quote.totalCost,
      )} with a ${quote.leadTimeDays}-day lead time.`,
    },
    {
      speaker: "ProcurePilot" as const,
      text: `The buyer is comparing multiple qualified suppliers. If you can improve the commercial terms now, I can prioritize your offer for approval today.`,
    },
    {
      speaker: "Supplier Desk" as const,
      text:
        savings > 0
          ? `We can approve a revised offer at ${formatCurrency(
              negotiatedTotalCost,
            )} total, keep the quote open for 72 hours, and ${
              negotiatedLeadTimeDays < quote.leadTimeDays
                ? `expedite dispatch to ${negotiatedLeadTimeDays} days`
                : "hold the current delivery plan"
            }.`
          : `We need to hold the current quote, but we can keep the offer open for 72 hours and maintain delivery at ${negotiatedLeadTimeDays} days.`,
    },
  ];

  return {
    supplierId: quote.supplierId,
    supplierName: quote.supplierName,
    recommendationKey,
    recommendationLabel,
    originalUnitPrice: quote.unitPrice,
    originalTotalCost: quote.totalCost,
    negotiatedUnitPrice,
    negotiatedTotalCost,
    savings,
    savingsPercent,
    originalLeadTimeDays: quote.leadTimeDays,
    negotiatedLeadTimeDays,
    sandboxAccount: buildSandboxAccount(quote.supplierId),
    termsWon,
    summary,
    transcript,
  } satisfies NegotiationResult;
}
