import { LiveSellerLink, ProcurementAssessment, RecommendationKey } from "@/lib/types";

function encodeQuery(value: string) {
  return encodeURIComponent(value.trim().replace(/\s+/g, " "));
}

function buildSearchUrl(query: string) {
  return `https://www.google.com/search?q=${encodeQuery(query)}`;
}

export function buildLiveSellerLinks(
  assessment: ProcurementAssessment,
  recommendationKey: RecommendationKey,
): LiveSellerLink[] {
  const recommendation = assessment.recommendations[recommendationKey];
  const itemName = assessment.request.itemName;
  const category = assessment.request.category;
  const region = `${recommendation.supplier.region} ${recommendation.supplier.country}`.trim();

  return [
    {
      label: "Live seller websites",
      url: buildSearchUrl(`${itemName} official supplier ${region}`),
      description:
        "Dynamic search for current supplier or distributor websites selling this item in the recommended region.",
    },
    {
      label: "Product availability",
      url: buildSearchUrl(`${itemName} buy ${category} ${region}`),
      description:
        "Dynamic search focused on current product pages, catalogs, and distributors for this procurement need.",
    },
  ];
}
