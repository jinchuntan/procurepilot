import { catalogItems, getItemById } from "@/lib/data";
import { CatalogItem, Priority, ProcurementRequest } from "@/lib/types";

export type CatalogSearchResult = {
  itemId: string;
  name: string;
  shortLabel: string;
  category: CatalogItem["category"];
  unit: string;
  description: string;
  technicalSpecs: string;
  matchScore: number;
};

type PreparedRequestInput = {
  itemId: string;
  quantity?: number;
  requiredBy?: string;
  daysUntilRequired?: number;
  budgetMin?: number;
  budgetMax?: number;
  priority?: Priority;
  minSupplierRating?: number;
  notes?: string;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 1);
}

function dateFromDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeRequiredBy(requiredBy?: string, daysUntilRequired?: number, priority: Priority = "High") {
  if (requiredBy) {
    const normalized = normalizeText(requiredBy);

    if (normalized === "today") {
      return dateFromDays(0);
    }

    if (normalized === "tomorrow") {
      return dateFromDays(1);
    }

    if (normalized === "next week") {
      return dateFromDays(7);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(requiredBy)) {
      return requiredBy;
    }

    const parsed = new Date(requiredBy);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  if (typeof daysUntilRequired === "number" && Number.isFinite(daysUntilRequired)) {
    return dateFromDays(Math.max(0, Math.min(90, Math.round(daysUntilRequired))));
  }

  if (priority === "Critical") {
    return dateFromDays(3);
  }

  if (priority === "High") {
    return dateFromDays(5);
  }

  if (priority === "Low") {
    return dateFromDays(10);
  }

  return dateFromDays(7);
}

function roundCurrency(value: number) {
  return Math.max(0, Math.round(value / 10) * 10);
}

function buildSearchText(item: CatalogItem) {
  return [
    item.id,
    item.name,
    item.shortLabel,
    item.category,
    item.description,
    item.technicalSpecs,
  ].join(" ");
}

function getMatchScore(query: string, item: CatalogItem) {
  const normalizedQuery = normalizeText(query);
  const tokens = tokenize(query);
  const haystack = normalizeText(buildSearchText(item));
  const normalizedName = normalizeText(item.name);
  const normalizedShortLabel = normalizeText(item.shortLabel);

  let score = 0;

  if (normalizedName.includes(normalizedQuery)) {
    score += 40;
  }

  if (normalizedShortLabel.includes(normalizedQuery)) {
    score += 28;
  }

  if (haystack.includes(normalizedQuery)) {
    score += 18;
  }

  for (const token of tokens) {
    if (normalizedName.includes(token)) {
      score += 10;
    }

    if (normalizedShortLabel.includes(token)) {
      score += 12;
    }

    if (item.id.includes(token)) {
      score += 8;
    }

    if (item.category.includes(token)) {
      score += 6;
    }

    if (haystack.includes(token)) {
      score += 3;
    }
  }

  return score;
}

export function searchCatalogItems(query: string, limit = 5) {
  return catalogItems
    .map((item) => ({
      itemId: item.id,
      name: item.name,
      shortLabel: item.shortLabel,
      category: item.category,
      unit: item.unit,
      description: item.description,
      technicalSpecs: item.technicalSpecs,
      matchScore: getMatchScore(query, item),
    }))
    .filter((item) => item.matchScore > 0)
    .sort((left, right) => right.matchScore - left.matchScore)
    .slice(0, limit);
}

export function prepareRequestFromItem(input: PreparedRequestInput): ProcurementRequest {
  const item = getItemById(input.itemId);

  if (!item) {
    throw new Error(`Unsupported itemId "${input.itemId}"`);
  }

  const quantity = Math.max(1, Math.round(input.quantity ?? item.defaultQuantity));
  const priority = input.priority ?? "High";
  const requiredBy = normalizeRequiredBy(input.requiredBy, input.daysUntilRequired, priority);
  const estimatedTotal = item.basePrice * quantity;
  const budgetMin = roundCurrency(input.budgetMin ?? estimatedTotal * 0.92);
  const budgetMax = roundCurrency(
    input.budgetMax ?? Math.max(estimatedTotal * 1.12, (input.budgetMin ?? estimatedTotal * 0.92) + 50),
  );

  return {
    id: `ad-hoc-${item.id}`,
    itemId: item.id,
    itemName: item.name,
    category: item.category,
    quantity,
    requiredBy,
    budgetMin: Math.min(budgetMin, budgetMax),
    budgetMax: Math.max(budgetMin, budgetMax),
    priority,
    minSupplierRating: input.minSupplierRating ?? 80,
    notes: input.notes?.trim() || `Prepared by ProcurePilot for ${item.shortLabel}.`,
    createdAt: new Date().toISOString(),
  };
}
