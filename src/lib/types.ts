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

export interface ProcurementRequestDraft {
  itemId?: string;
  itemName?: string;
  category?: Category;
  quantity: number;
  requiredBy: string;
  budgetMin: number;
  budgetMax: number;
  priority: Priority;
  minSupplierRating: number;
  notes: string;
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
  totalCost: number;
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

export type RecommendationKey = keyof RecommendationBundle;

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

export interface OutcomeMetrics {
  savingsVsMedian: number;
  leadTimeImprovementDays: number;
  riskReductionPoints: number;
}

export interface UrgencyComparison {
  changed: boolean;
  message: string;
}

export interface ProcurementAssessment {
  generatedAt: string;
  request: ProcurementRequest;
  summary: string;
  scoredQuotes: ScoredSupplierQuote[];
  recommendations: RecommendationBundle;
  riskInsights: RiskInsight[];
  substitutes: SubstituteSuggestion[];
  urgencyComparison: UrgencyComparison;
  outcomeMetrics: OutcomeMetrics;
  warnings: string[];
}

export interface NegotiationTurn {
  speaker: "ProcurePilot" | "Supplier Desk";
  text: string;
}

export interface NegotiationResult {
  supplierId: string;
  supplierName: string;
  recommendationKey: RecommendationKey;
  recommendationLabel: string;
  originalUnitPrice: number;
  originalTotalCost: number;
  negotiatedUnitPrice: number;
  negotiatedTotalCost: number;
  savings: number;
  savingsPercent: number;
  originalLeadTimeDays: number;
  negotiatedLeadTimeDays: number;
  sandboxAccount: string;
  termsWon: string[];
  summary: string;
  transcript: NegotiationTurn[];
}

export type NegotiationSessionStatus = "open" | "closed";

export interface NegotiationRoomMessage {
  id: string;
  role: "buyer" | "seller";
  speaker: string;
  text: string;
  createdAt: string;
}

export interface NegotiationSessionSummary {
  id: string;
  requestId: string;
  supplierId: string;
  supplierName: string;
  recommendationKey: RecommendationKey;
  recommendationLabel: string;
  status: NegotiationSessionStatus;
  openedTotal: number;
  targetTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface NegotiationRoom {
  session: NegotiationSessionSummary;
  request: ProcurementRequest;
  recommendation: RecommendationResult;
  messages: NegotiationRoomMessage[];
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
