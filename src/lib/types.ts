export type Category =
  | "maintenance"
  | "office supplies"
  | "packaging"
  | "chemicals"
  | "spare parts"
  | "electronics"
  | "safety equipment";

export type Priority = "Low" | "Medium" | "High" | "Critical";

export type RiskLevel = "Low" | "Medium" | "High";

export interface SupplierProfile {
  id: string;
  name: string;
  country: string;
  region: string;
  supportedCategories: Category[];
  baseReliability: number;
  priceIndex: number;
  speedFactor: number;
  riskIndex: number;
  deliveryConfidence: number;
  sustainabilityTag: string;
  complianceTag: string;
  specialtyItems?: string[];
}

export interface CrisisProfile {
  priceSpike: number;
  logistics: number;
  concentration: number;
  notes: string[];
}

export interface CatalogItem {
  id: string;
  name: string;
  shortLabel: string;
  category: Category;
  unit: string;
  description: string;
  technicalSpecs: string;
  basePrice: number;
  baseLeadTime: number;
  defaultQuantity: number;
  baseMoq: number;
  supplierIds: string[];
  substituteIds: string[];
  crisisProfile: CrisisProfile;
}

export interface ProcurementRequest {
  id: string;
  itemId: string;
  itemName: string;
  category: Category;
  quantity: number;
  requiredBy: string;
  budgetMin: number;
  budgetMax: number;
  priority: Priority;
  minSupplierRating: number;
  notes: string;
  createdAt: string;
}

export interface SupplierQuote {
  supplierId: string;
  supplierName: string;
  itemId: string;
  unitPrice: number;
  leadTimeDays: number;
  reliability: number;
  stockAvailability: number;
  region: string;
  country: string;
  riskScore: number;
  riskLevel: RiskLevel;
  moq: number;
  deliveryConfidence: number;
  sustainabilityTag: string;
  complianceTag: string;
}

export interface Weights {
  price: number;
  leadTime: number;
  reliability: number;
  stockAvailability: number;
  supplierRisk: number;
  urgencyFit: number;
}

export interface ScoreBreakdown {
  price: number;
  leadTime: number;
  reliability: number;
  stockAvailability: number;
  supplierRisk: number;
  urgencyFit: number;
  balanced: number;
  final: number;
}

export interface ScoredSupplierQuote extends SupplierQuote {
  finalScore: number;
  scoreBreakdown: ScoreBreakdown;
  flags: string[];
}

export interface RecommendationResult {
  label: string;
  supplier: ScoredSupplierQuote;
  reason: string;
}

export interface RecommendationBundle {
  overall: RecommendationResult;
  lowCost: RecommendationResult;
  fastest: RecommendationResult;
  balanced: RecommendationResult;
}

export interface RiskInsight {
  key: string;
  label: string;
  description: string;
  severity: RiskLevel;
  score: number;
}

export interface SubstituteSuggestion {
  itemId: string;
  itemName: string;
  topSupplier: string;
  region: string;
  leadTimeDays: number;
  priceDelta: number;
  riskLevel: RiskLevel;
  rationale: string;
}

export interface SampleRequestTemplate {
  id: string;
  label: string;
  itemId: string;
  quantity: number;
  requiredInDays: number;
  priority: Priority;
  budgetMin: number;
  budgetMax: number;
  minSupplierRating: number;
  notes: string;
}
