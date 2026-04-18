import { buildQuotesForItem, getItemById } from "@/lib/data";
import {
  ProcurementRequest,
  RecommendationBundle,
  RecommendationResult,
  RiskInsight,
  RiskLevel,
  ScoredSupplierQuote,
  SubstituteSuggestion,
  SupplierQuote,
  Weights,
} from "@/lib/types";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHigherBetter(value: number, min: number, max: number) {
  if (max === min) {
    return 100;
  }

  return ((value - min) / (max - min)) * 100;
}

function normalizeLowerBetter(value: number, min: number, max: number) {
  if (max === min) {
    return 100;
  }

  return ((max - value) / (max - min)) * 100;
}

function variance(values: number[]) {
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
}

function getRange(values: number[]) {
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function daysUntil(dateValue: string) {
  const today = new Date();
  const target = new Date(dateValue);
  const difference = target.getTime() - today.getTime();
  return Math.max(0, Math.ceil(difference / (1000 * 60 * 60 * 24)));
}

export function getUrgencyFit(leadTimeDays: number, request: ProcurementRequest) {
  const daysRemaining = Math.max(daysUntil(request.requiredBy), 1);
  const leadGap = daysRemaining - leadTimeDays;

  if (leadGap >= 4) {
    return 95;
  }

  if (leadGap >= 2) {
    return 85;
  }

  if (leadGap >= 0) {
    return request.priority === "Critical" ? 72 : 76;
  }

  if (leadGap >= -2) {
    return request.priority === "Critical" ? 38 : 48;
  }

  return request.priority === "Critical" ? 15 : 28;
}

function buildFlags(quote: SupplierQuote, request: ProcurementRequest) {
  const flags: string[] = [];
  const daysRemaining = daysUntil(request.requiredBy);

  if (quote.riskLevel === "High") {
    flags.push("High supply risk");
  }

  if (quote.leadTimeDays > daysRemaining) {
    flags.push("Misses requested date");
  }

  if (quote.reliability < request.minSupplierRating) {
    flags.push("Below minimum rating");
  }

  if (quote.stockAvailability < 40) {
    flags.push("Thin available stock");
  }

  if (quote.moq > request.quantity) {
    flags.push("MOQ above required quantity");
  }

  return flags;
}

export function scoreQuotesForRequest(
  request: ProcurementRequest,
  weights: Weights,
  quotes = buildQuotesForItem(request.itemId),
) {
  if (!quotes.length) {
    return [] as ScoredSupplierQuote[];
  }

  const priceRange = getRange(quotes.map((quote) => quote.unitPrice));
  const leadRange = getRange(quotes.map((quote) => quote.leadTimeDays));
  const reliabilityRange = getRange(quotes.map((quote) => quote.reliability));
  const stockRange = getRange(quotes.map((quote) => quote.stockAvailability));
  const riskRange = getRange(quotes.map((quote) => quote.riskScore));
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const daysRemaining = daysUntil(request.requiredBy);

  return quotes
    .map((quote) => {
      const price = normalizeLowerBetter(quote.unitPrice, priceRange.min, priceRange.max);
      const leadTime = normalizeLowerBetter(quote.leadTimeDays, leadRange.min, leadRange.max);
      const reliability = normalizeHigherBetter(
        quote.reliability,
        reliabilityRange.min,
        reliabilityRange.max,
      );
      const stockAvailability = normalizeHigherBetter(
        quote.stockAvailability,
        stockRange.min,
        stockRange.max,
      );
      const supplierRisk = normalizeLowerBetter(quote.riskScore, riskRange.min, riskRange.max);
      const urgencyFit = getUrgencyFit(quote.leadTimeDays, request);

      let final =
        (price * weights.price +
          leadTime * weights.leadTime +
          reliability * weights.reliability +
          stockAvailability * weights.stockAvailability +
          supplierRisk * weights.supplierRisk +
          urgencyFit * weights.urgencyFit) /
        totalWeight;

      if (quote.reliability < request.minSupplierRating) {
        final -= 8;
      }

      if (quote.moq > request.quantity) {
        final -= 6;
      }

      if (quote.leadTimeDays > daysRemaining) {
        final -= request.priority === "Critical" ? 14 : 9;
      }

      if (quote.stockAvailability < 35) {
        final -= 5;
      }

      const balancedInputs = [
        price,
        leadTime,
        reliability,
        stockAvailability,
        supplierRisk,
        urgencyFit,
      ];
      const balanced =
        balancedInputs.reduce((sum, value) => sum + value, 0) / balancedInputs.length -
        Math.sqrt(variance(balancedInputs)) * 0.15 -
        (quote.riskLevel === "High" ? 4 : 0);

      return {
        ...quote,
        finalScore: clamp(Math.round(final * 10) / 10, 0, 100),
        scoreBreakdown: {
          price: Math.round(price),
          leadTime: Math.round(leadTime),
          reliability: Math.round(reliability),
          stockAvailability: Math.round(stockAvailability),
          supplierRisk: Math.round(supplierRisk),
          urgencyFit: Math.round(urgencyFit),
          balanced: clamp(Math.round(balanced), 0, 100),
          final: clamp(Math.round(final), 0, 100),
        },
        flags: buildFlags(quote, request),
      };
    })
    .sort((left, right) => right.finalScore - left.finalScore);
}

function compareAgainstMedian(values: number[], currentValue: number, lowerIsBetter = false) {
  const sorted = [...values].sort((left, right) => left - right);
  const median = sorted[Math.floor(sorted.length / 2)];

  if (lowerIsBetter) {
    return currentValue <= median ? "better-than-median" : "above-median";
  }

  return currentValue >= median ? "better-than-median" : "below-median";
}

export function buildRecommendationReason(
  mode: RecommendationResult["label"],
  supplier: ScoredSupplierQuote,
  request: ProcurementRequest,
  scoredQuotes: ScoredSupplierQuote[],
) {
  const priceSignal = compareAgainstMedian(
    scoredQuotes.map((quote) => quote.unitPrice),
    supplier.unitPrice,
    true,
  );
  const leadSignal = compareAgainstMedian(
    scoredQuotes.map((quote) => quote.leadTimeDays),
    supplier.leadTimeDays,
    true,
  );

  const priceCopy =
    priceSignal === "better-than-median"
      ? "pricing is below the peer median"
      : "pricing stays acceptable for the service level";
  const leadCopy =
    leadSignal === "better-than-median"
      ? "lead time is among the fastest in the shortlist"
      : "lead time is still workable for the requested window";

  if (mode === "Best low-cost supplier") {
    return `This supplier wins on landed cost while still meeting the minimum rating and keeping risk at ${supplier.riskLevel.toLowerCase()} level. It is the best fit when budget pressure matters most.`;
  }

  if (mode === "Best fastest-delivery supplier") {
    return `This supplier is recommended for speed because it can ship in ${supplier.leadTimeDays} days, carries ${supplier.stockAvailability}% stock availability, and keeps delivery confidence high enough for an urgent order.`;
  }

  if (mode === "Best balanced option") {
    return `This option stays well-rounded across price, reliability, availability, and risk. It avoids sharp trade-offs, which makes it a safe choice when the team wants resilience without overpaying.`;
  }

  return `This supplier is recommended because ${priceCopy}, ${leadCopy}, and reliability remains strong at ${supplier.reliability}%. For a ${request.priority.toLowerCase()} request, that mix gives the most practical business outcome.`;
}

export function getRecommendationBundle(
  request: ProcurementRequest,
  scoredQuotes: ScoredSupplierQuote[],
) {
  const eligibleQuotes = scoredQuotes.filter(
    (quote) =>
      quote.reliability >= request.minSupplierRating &&
      quote.moq <= Math.max(request.quantity * 1.2, request.quantity + 2),
  );
  const pool = eligibleQuotes.length ? eligibleQuotes : scoredQuotes;

  const overall = pool[0];
  const lowCost =
    [...pool].sort((left, right) => left.unitPrice - right.unitPrice || right.finalScore - left.finalScore)[0] ??
    overall;
  const fastest =
    [...pool].sort(
      (left, right) =>
        left.leadTimeDays - right.leadTimeDays || right.deliveryConfidence - left.deliveryConfidence,
    )[0] ?? overall;
  const balanced =
    [...pool].sort(
      (left, right) =>
        right.scoreBreakdown.balanced - left.scoreBreakdown.balanced ||
        right.finalScore - left.finalScore,
    )[0] ?? overall;

  const buildResult = (label: RecommendationResult["label"], supplier: ScoredSupplierQuote) => ({
    label,
    supplier,
    reason: buildRecommendationReason(label, supplier, request, scoredQuotes),
  });

  return {
    overall: buildResult("Best overall supplier", overall),
    lowCost: buildResult("Best low-cost supplier", lowCost),
    fastest: buildResult("Best fastest-delivery supplier", fastest),
    balanced: buildResult("Best balanced option", balanced),
  } satisfies RecommendationBundle;
}

function severityFromScore(score: number): RiskLevel {
  if (score >= 70) {
    return "High";
  }

  if (score >= 40) {
    return "Medium";
  }

  return "Low";
}

export function getRiskInsights(request: ProcurementRequest, scoredQuotes: ScoredSupplierQuote[]) {
  const item = getItemById(request.itemId);

  if (!item || !scoredQuotes.length) {
    return [] as RiskInsight[];
  }

  const averageLeadTime =
    scoredQuotes.reduce((sum, quote) => sum + quote.leadTimeDays, 0) / scoredQuotes.length;
  const averageRisk = scoredQuotes.reduce((sum, quote) => sum + quote.riskScore, 0) / scoredQuotes.length;
  const daysRemaining = daysUntil(request.requiredBy);

  return [
    {
      key: "price-spike",
      label: "Price spike risk",
      description: "Market pricing is moving quickly on this category, so lock a quote early.",
      severity: severityFromScore(item.crisisProfile.priceSpike),
      score: item.crisisProfile.priceSpike,
    },
    {
      key: "logistics",
      label: "Logistics disruption risk",
      description: "Regional shipping and customs lanes are stretching replenishment timelines.",
      severity: severityFromScore(item.crisisProfile.logistics),
      score: item.crisisProfile.logistics,
    },
    {
      key: "concentration",
      label: "Supplier concentration risk",
      description: "Too many shortlist vendors depend on overlapping upstream supply lines.",
      severity: severityFromScore(item.crisisProfile.concentration),
      score: item.crisisProfile.concentration,
    },
    {
      key: "lead-time",
      label: "Long lead time risk",
      description:
        averageLeadTime > daysRemaining
          ? "Current average lead time is outside the requested delivery window."
          : "Lead times are still manageable, but only a subset of vendors can hit the date.",
      severity: severityFromScore((averageLeadTime / Math.max(daysRemaining, 1)) * 55 + averageRisk * 0.4),
      score: Math.round((averageLeadTime / Math.max(daysRemaining, 1)) * 55 + averageRisk * 0.4),
    },
  ];
}

export function getSubstituteSuggestions(
  request: ProcurementRequest,
  weights: Weights,
  scoredQuotes: ScoredSupplierQuote[],
) {
  const item = getItemById(request.itemId);

  if (!item) {
    return [] as SubstituteSuggestion[];
  }

  const topQuote = scoredQuotes[0];
  const shouldSuggest =
    !topQuote ||
    topQuote.riskLevel === "High" ||
    topQuote.stockAvailability < 55 ||
    topQuote.leadTimeDays > daysUntil(request.requiredBy);

  if (!shouldSuggest) {
    return [] as SubstituteSuggestion[];
  }

  return item.substituteIds
    .map((substituteId) => {
      const substituteItem = getItemById(substituteId);

      if (!substituteItem) {
        return null;
      }

      const substituteRequest = {
        ...request,
        itemId: substituteItem.id,
        itemName: substituteItem.name,
        category: substituteItem.category,
      };
      const substituteQuotes = scoreQuotesForRequest(substituteRequest, weights);
      const topSubstitute = substituteQuotes[0];

      if (!topSubstitute) {
        return null;
      }

      return {
        itemId: substituteItem.id,
        itemName: substituteItem.name,
        topSupplier: topSubstitute.supplierName,
        region: topSubstitute.region,
        leadTimeDays: topSubstitute.leadTimeDays,
        priceDelta: topSubstitute.unitPrice - (topQuote?.unitPrice ?? substituteItem.basePrice),
        riskLevel: topSubstitute.riskLevel,
        rationale:
          topSubstitute.leadTimeDays < (topQuote?.leadTimeDays ?? 99)
            ? "Faster regional availability makes this a practical substitute during disruption."
            : "This option slightly raises cost but reduces concentration risk across the shortlist.",
      } satisfies SubstituteSuggestion;
    })
    .filter((suggestion): suggestion is SubstituteSuggestion => suggestion !== null);
}

export function buildUrgencyComparison(
  request: ProcurementRequest,
  weights: Weights,
  currentQuotes: ScoredSupplierQuote[],
) {
  const criticalScenario = scoreQuotesForRequest({ ...request, priority: "Critical" }, weights);
  const currentTop = currentQuotes[0];
  const criticalTop = criticalScenario[0];

  if (!currentTop || !criticalTop || currentTop.supplierId === criticalTop.supplierId) {
    return {
      changed: false,
      message:
        "Even if urgency increases to critical, the same supplier stays on top because it already balances speed, reliability, and risk well.",
    };
  }

  return {
    changed: true,
    message: `If urgency moves to critical, the recommendation shifts from ${currentTop.supplierName} to ${criticalTop.supplierName} because lead time and date-fit start to outweigh pure cost savings.`,
  };
}
