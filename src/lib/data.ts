import {
  Category,
  CatalogItem,
  ProcurementRequest,
  SampleRequestTemplate,
  SupplierProfile,
  SupplierQuote,
  Weights,
} from "@/lib/types";

const REFERENCE_DATE = new Date();

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function futureDate(daysFromNow: number) {
  const date = new Date(REFERENCE_DATE);
  date.setDate(date.getDate() + daysFromNow);
  return toIsoDate(date);
}

function seededFraction(seed: string) {
  let hash = 17;

  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 1000003;
  }

  return (hash % 1000) / 1000;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function riskLevelFromScore(score: number) {
  if (score <= 33) {
    return "Low";
  }

  if (score <= 66) {
    return "Medium";
  }

  return "High";
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeSearchText(value: string) {
  return normalizeSearchText(value)
    .split(" ")
    .filter((token) => token.length > 1);
}

function buildShortLabel(value: string) {
  return value
    .split(/\s+/)
    .slice(0, 3)
    .join(" ")
    .trim()
    .slice(0, 32);
}

function inferUnitFromText(value: string, fallback: string) {
  const normalized = normalizeSearchText(value);

  if (normalized.includes("drum")) {
    return "drum";
  }

  if (normalized.includes("pail")) {
    return "pail";
  }

  if (normalized.includes("box")) {
    return "box";
  }

  if (normalized.includes("glove")) {
    return "box of 100";
  }

  if (normalized.includes("filter")) {
    return "filter";
  }

  if (normalized.includes("label")) {
    return "roll case";
  }

  if (normalized.includes("board") || normalized.includes("module")) {
    return "module";
  }

  if (normalized.includes("part") || normalized.includes("kit")) {
    return "set";
  }

  return fallback;
}

const categoryKeywords: Array<{ category: Category; keywords: string[] }> = [
  {
    category: "maintenance",
    keywords: ["lubricant", "filter", "bearing", "seal", "compressor", "pump", "hvac", "motor"],
  },
  {
    category: "office supplies",
    keywords: ["paper", "stationery", "toner", "printer", "copier", "folder", "pen"],
  },
  {
    category: "packaging",
    keywords: ["carton", "box", "mailer", "label", "packaging", "wrap", "pallet", "tape"],
  },
  {
    category: "chemicals",
    keywords: ["chemical", "cleaner", "solvent", "degreaser", "acid", "caustic", "alkaline"],
  },
  {
    category: "spare parts",
    keywords: ["spare", "injector", "gear", "valve", "belt", "coupling", "bearing kit", "gasket"],
  },
  {
    category: "electronics",
    keywords: ["sensor", "pcb", "controller", "board", "stm32", "module", "relay", "electronics"],
  },
  {
    category: "safety equipment",
    keywords: ["glove", "ppe", "helmet", "goggle", "mask", "vest", "respirator", "safety"],
  },
];

const categoryBenchmarks: Record<Category, string> = {
  maintenance: "industrial-lubricant-a",
  "office supplies": "copier-paper",
  packaging: "corrugated-cartons",
  chemicals: "caustic-cleaner",
  "spare parts": "generator-injector-kit",
  electronics: "stm32-control-board",
  "safety equipment": "nitrile-safety-gloves",
};

export const defaultWeights: Weights = {
  price: 24,
  leadTime: 22,
  reliability: 20,
  stockAvailability: 14,
  supplierRisk: 12,
  urgencyFit: 8,
};

export const supplierProfiles: SupplierProfile[] = [
  {
    id: "straits-industrial-supply",
    name: "Straits Industrial Supply",
    country: "Singapore",
    region: "Singapore Hub",
    supportedCategories: ["maintenance", "electronics", "spare parts"],
    baseReliability: 93,
    priceIndex: 1.08,
    speedFactor: 0.82,
    riskIndex: 0.26,
    deliveryConfidence: 94,
    sustainabilityTag: "Green freight lane",
    complianceTag: "ISO 9001",
    specialtyItems: ["industrial-lubricant-a", "stm32-control-board"],
  },
  {
    id: "nusantara-packaging-hub",
    name: "Nusantara Packaging Hub",
    country: "Indonesia",
    region: "Jakarta",
    supportedCategories: ["packaging", "office supplies"],
    baseReliability: 84,
    priceIndex: 0.92,
    speedFactor: 1.02,
    riskIndex: 0.38,
    deliveryConfidence: 83,
    sustainabilityTag: "Recycled carton line",
    complianceTag: "FSC",
    specialtyItems: ["corrugated-cartons", "recycled-mailers"],
  },
  {
    id: "mekong-safety-systems",
    name: "Mekong Safety Systems",
    country: "Vietnam",
    region: "Ho Chi Minh City",
    supportedCategories: ["safety equipment", "maintenance"],
    baseReliability: 89,
    priceIndex: 0.97,
    speedFactor: 0.94,
    riskIndex: 0.34,
    deliveryConfidence: 88,
    sustainabilityTag: "Audited PPE sourcing",
    complianceTag: "ISO 45001",
    specialtyItems: ["nitrile-safety-gloves", "neoprene-chemical-gloves"],
  },
  {
    id: "penang-precision-components",
    name: "Penang Precision Components",
    country: "Malaysia",
    region: "Penang",
    supportedCategories: ["electronics", "spare parts"],
    baseReliability: 91,
    priceIndex: 1.04,
    speedFactor: 0.89,
    riskIndex: 0.24,
    deliveryConfidence: 92,
    sustainabilityTag: "RoHS-tracked sourcing",
    complianceTag: "ISO 14001",
    specialtyItems: ["stm32-control-board", "industrial-io-controller"],
  },
  {
    id: "siam-cleanchem",
    name: "Siam CleanChem",
    country: "Thailand",
    region: "Bangkok",
    supportedCategories: ["chemicals", "maintenance"],
    baseReliability: 87,
    priceIndex: 0.95,
    speedFactor: 0.97,
    riskIndex: 0.41,
    deliveryConfidence: 85,
    sustainabilityTag: "Low-VOC portfolio",
    complianceTag: "ISO 9001",
    specialtyItems: ["caustic-cleaner", "low-foam-degreaser"],
  },
  {
    id: "borneo-maintenance-works",
    name: "Borneo Maintenance Works",
    country: "Malaysia",
    region: "Kota Kinabalu",
    supportedCategories: ["maintenance", "spare parts", "safety equipment"],
    baseReliability: 86,
    priceIndex: 0.93,
    speedFactor: 1.08,
    riskIndex: 0.36,
    deliveryConfidence: 82,
    sustainabilityTag: "Regional stocking program",
    complianceTag: "ISO 9001",
    specialtyItems: ["industrial-lubricant-b", "generator-injector-kit"],
  },
  {
    id: "pacific-trade-link",
    name: "Pacific Trade Link",
    country: "Philippines",
    region: "Manila",
    supportedCategories: ["office supplies", "packaging", "safety equipment"],
    baseReliability: 81,
    priceIndex: 0.89,
    speedFactor: 1.11,
    riskIndex: 0.48,
    deliveryConfidence: 79,
    sustainabilityTag: "Paper chain disclosure",
    complianceTag: "FSC",
  },
  {
    id: "delta-lubricants-asia",
    name: "Delta Lubricants Asia",
    country: "Singapore",
    region: "Jurong",
    supportedCategories: ["maintenance", "chemicals"],
    baseReliability: 92,
    priceIndex: 1.01,
    speedFactor: 0.86,
    riskIndex: 0.29,
    deliveryConfidence: 93,
    sustainabilityTag: "OEM-equivalent certified",
    complianceTag: "ISO 9001",
    specialtyItems: ["industrial-lubricant-a", "industrial-lubricant-b"],
  },
  {
    id: "andaman-power-parts",
    name: "Andaman Power Parts",
    country: "Thailand",
    region: "Laem Chabang",
    supportedCategories: ["spare parts", "maintenance"],
    baseReliability: 88,
    priceIndex: 0.98,
    speedFactor: 0.91,
    riskIndex: 0.37,
    deliveryConfidence: 89,
    sustainabilityTag: "Critical parts reserve",
    complianceTag: "ISO 9001",
    specialtyItems: ["generator-injector-kit", "aftermarket-injector-kit"],
  },
  {
    id: "java-sourceone",
    name: "Java SourceOne",
    country: "Indonesia",
    region: "Surabaya",
    supportedCategories: ["office supplies", "packaging", "safety equipment"],
    baseReliability: 82,
    priceIndex: 0.9,
    speedFactor: 1.09,
    riskIndex: 0.44,
    deliveryConfidence: 81,
    sustainabilityTag: "Multi-site sourcing",
    complianceTag: "ISO 9001",
  },
  {
    id: "lion-city-industrial-tech",
    name: "Lion City Industrial Tech",
    country: "Singapore",
    region: "Tuas",
    supportedCategories: ["electronics", "spare parts", "maintenance"],
    baseReliability: 94,
    priceIndex: 1.12,
    speedFactor: 0.78,
    riskIndex: 0.2,
    deliveryConfidence: 96,
    sustainabilityTag: "Dual-lane fulfillment",
    complianceTag: "ISO 9001",
    specialtyItems: ["industrial-io-controller", "generator-injector-kit"],
  },
  {
    id: "sabah-safety-gear",
    name: "Sabah Safety Gear",
    country: "Malaysia",
    region: "Kota Kinabalu",
    supportedCategories: ["safety equipment", "office supplies"],
    baseReliability: 85,
    priceIndex: 0.91,
    speedFactor: 1.04,
    riskIndex: 0.35,
    deliveryConfidence: 84,
    sustainabilityTag: "Local buffer stock",
    complianceTag: "ISO 45001",
    specialtyItems: ["nitrile-safety-gloves"],
  },
  {
    id: "horizon-paper-pack",
    name: "Horizon Paper & Pack",
    country: "Vietnam",
    region: "Da Nang",
    supportedCategories: ["packaging", "office supplies"],
    baseReliability: 86,
    priceIndex: 0.94,
    speedFactor: 1.01,
    riskIndex: 0.33,
    deliveryConfidence: 84,
    sustainabilityTag: "FSC-certified fibers",
    complianceTag: "FSC",
    specialtyItems: ["corrugated-cartons", "thermal-labels", "copier-paper"],
  },
  {
    id: "meranti-chem-solutions",
    name: "Meranti Chem Solutions",
    country: "Malaysia",
    region: "Johor",
    supportedCategories: ["chemicals", "maintenance", "safety equipment"],
    baseReliability: 88,
    priceIndex: 0.99,
    speedFactor: 0.95,
    riskIndex: 0.31,
    deliveryConfidence: 87,
    sustainabilityTag: "Hazmat-compliant fleet",
    complianceTag: "ISO 14001",
    specialtyItems: ["low-foam-degreaser", "caustic-cleaner"],
  },
  {
    id: "batam-circuit-supply",
    name: "Batam Circuit Supply",
    country: "Indonesia",
    region: "Batam",
    supportedCategories: ["electronics", "spare parts"],
    baseReliability: 83,
    priceIndex: 0.93,
    speedFactor: 1.03,
    riskIndex: 0.46,
    deliveryConfidence: 80,
    sustainabilityTag: "RoHS-ready assembly",
    complianceTag: "RoHS",
    specialtyItems: ["stm32-control-board", "industrial-io-controller"],
  },
  {
    id: "cebu-facility-essentials",
    name: "Cebu Facility Essentials",
    country: "Philippines",
    region: "Cebu",
    supportedCategories: ["office supplies", "chemicals", "maintenance"],
    baseReliability: 83,
    priceIndex: 0.9,
    speedFactor: 1.06,
    riskIndex: 0.45,
    deliveryConfidence: 81,
    sustainabilityTag: "Regional mix sourcing",
    complianceTag: "ISO 9001",
    specialtyItems: ["copier-paper", "caustic-cleaner"],
  },
  {
    id: "siam-bearings-motion",
    name: "Siam Bearings & Motion",
    country: "Thailand",
    region: "Rayong",
    supportedCategories: ["spare parts", "maintenance"],
    baseReliability: 90,
    priceIndex: 0.97,
    speedFactor: 0.9,
    riskIndex: 0.28,
    deliveryConfidence: 90,
    sustainabilityTag: "Strategic spare hub",
    complianceTag: "ISO 9001",
    specialtyItems: ["generator-injector-kit", "aftermarket-injector-kit"],
  },
  {
    id: "red-river-procurement-network",
    name: "Red River Procurement Network",
    country: "Vietnam",
    region: "Hanoi",
    supportedCategories: [
      "maintenance",
      "office supplies",
      "packaging",
      "chemicals",
      "spare parts",
      "electronics",
      "safety equipment",
    ],
    baseReliability: 87,
    priceIndex: 0.96,
    speedFactor: 0.98,
    riskIndex: 0.32,
    deliveryConfidence: 88,
    sustainabilityTag: "Diversified supplier base",
    complianceTag: "ISO 9001",
  },
];

export const catalogItems: CatalogItem[] = [
  {
    id: "industrial-lubricant-a",
    name: "Industrial lubricant A ISO 68",
    shortLabel: "Lubricant A",
    category: "maintenance",
    unit: "200L drum",
    description: "Hydraulic and compressor lubricant for plant equipment running 24/7.",
    technicalSpecs: "ISO VG 68, anti-wear additive package, OEM equivalent acceptable.",
    basePrice: 485,
    baseLeadTime: 5,
    defaultQuantity: 12,
    baseMoq: 2,
    supplierIds: [
      "delta-lubricants-asia",
      "straits-industrial-supply",
      "borneo-maintenance-works",
      "andaman-power-parts",
      "meranti-chem-solutions",
      "red-river-procurement-network",
    ],
    substituteIds: ["industrial-lubricant-b"],
    crisisProfile: {
      priceSpike: 78,
      logistics: 46,
      concentration: 68,
      notes: [
        "Regional refinery output is tight after an oil supply shock.",
        "Two incumbent suppliers rely on the same west coast shipping lane.",
      ],
    },
  },
  {
    id: "industrial-lubricant-b",
    name: "Industrial lubricant B synthetic blend",
    shortLabel: "Lubricant B",
    category: "maintenance",
    unit: "200L drum",
    description: "Equivalent synthetic blend used when branded lubricant lines are constrained.",
    technicalSpecs: "ISO VG 68 equivalent, synthetic blend, food-safe variant not required.",
    basePrice: 515,
    baseLeadTime: 4,
    defaultQuantity: 10,
    baseMoq: 2,
    supplierIds: [
      "delta-lubricants-asia",
      "borneo-maintenance-works",
      "straits-industrial-supply",
      "siam-cleanchem",
      "meranti-chem-solutions",
      "red-river-procurement-network",
    ],
    substituteIds: ["industrial-lubricant-a"],
    crisisProfile: {
      priceSpike: 64,
      logistics: 38,
      concentration: 48,
      notes: [
        "Blend alternative is more available across secondary distributors.",
        "Synthetic base oil remains exposed to currency swings.",
      ],
    },
  },
  {
    id: "corrugated-cartons",
    name: "Corrugated packaging cartons 400x300mm",
    shortLabel: "Cartons",
    category: "packaging",
    unit: "bundle of 50",
    description: "Standard export-grade cartons for finished goods and spare part shipments.",
    technicalSpecs: "Double wall, 5-ply, 15kg load rating, print not required.",
    basePrice: 36,
    baseLeadTime: 6,
    defaultQuantity: 140,
    baseMoq: 20,
    supplierIds: [
      "nusantara-packaging-hub",
      "horizon-paper-pack",
      "pacific-trade-link",
      "java-sourceone",
      "red-river-procurement-network",
      "straits-industrial-supply",
    ],
    substituteIds: ["recycled-mailers", "thermal-labels"],
    crisisProfile: {
      priceSpike: 44,
      logistics: 52,
      concentration: 41,
      notes: [
        "Container repositioning is delaying pulp-based packaging replenishment.",
        "Carton pricing is up after a raw paper input increase.",
      ],
    },
  },
  {
    id: "recycled-mailers",
    name: "Recycled protective mailers",
    shortLabel: "Mailers",
    category: "packaging",
    unit: "carton of 100",
    description: "Lightweight protective mailers for e-commerce and spare parts dispatches.",
    technicalSpecs: "100% recycled fiber outer, tamper seal, medium cushioning.",
    basePrice: 24,
    baseLeadTime: 4,
    defaultQuantity: 100,
    baseMoq: 10,
    supplierIds: [
      "nusantara-packaging-hub",
      "horizon-paper-pack",
      "pacific-trade-link",
      "java-sourceone",
      "red-river-procurement-network",
    ],
    substituteIds: ["corrugated-cartons"],
    crisisProfile: {
      priceSpike: 36,
      logistics: 28,
      concentration: 33,
      notes: [
        "Alternative mailer stock is healthier than standard cartons this week.",
        "Recycled fiber lines give some insulation from virgin pulp volatility.",
      ],
    },
  },
  {
    id: "nitrile-safety-gloves",
    name: "Nitrile safety gloves 8 mil",
    shortLabel: "Nitrile gloves",
    category: "safety equipment",
    unit: "box of 100",
    description: "General industrial nitrile gloves for maintenance, warehouse, and packing teams.",
    technicalSpecs: "Powder-free, textured grip, size mix allowed, chemical splash resistant.",
    basePrice: 9,
    baseLeadTime: 3,
    defaultQuantity: 220,
    baseMoq: 20,
    supplierIds: [
      "mekong-safety-systems",
      "sabah-safety-gear",
      "java-sourceone",
      "pacific-trade-link",
      "meranti-chem-solutions",
      "red-river-procurement-network",
    ],
    substituteIds: ["neoprene-chemical-gloves"],
    crisisProfile: {
      priceSpike: 31,
      logistics: 24,
      concentration: 29,
      notes: [
        "PPE supply is more stable, but size mix availability can still be patchy.",
        "Critical shipments increasingly favor local buffer stock over imports.",
      ],
    },
  },
  {
    id: "neoprene-chemical-gloves",
    name: "Neoprene chemical-resistant gloves",
    shortLabel: "Neoprene gloves",
    category: "safety equipment",
    unit: "pair",
    description: "Higher-protection glove alternative for chemical handling and washdown work.",
    technicalSpecs: "Long cuff, chemical resistant, reusable, textured palm.",
    basePrice: 12,
    baseLeadTime: 4,
    defaultQuantity: 180,
    baseMoq: 12,
    supplierIds: [
      "mekong-safety-systems",
      "sabah-safety-gear",
      "meranti-chem-solutions",
      "java-sourceone",
      "red-river-procurement-network",
    ],
    substituteIds: ["nitrile-safety-gloves"],
    crisisProfile: {
      priceSpike: 27,
      logistics: 22,
      concentration: 26,
      notes: [
        "Reusable glove options ease consumption spikes during disruption periods.",
        "Total spend is slightly higher, but restocking is steadier.",
      ],
    },
  },
  {
    id: "generator-injector-kit",
    name: "Diesel generator fuel injector kit",
    shortLabel: "Injector kit",
    category: "spare parts",
    unit: "set",
    description: "Critical spare part kit used for onsite generator uptime during outages.",
    technicalSpecs: "OEM-compatible injector set for 250-350kVA generator platforms.",
    basePrice: 760,
    baseLeadTime: 8,
    defaultQuantity: 4,
    baseMoq: 1,
    supplierIds: [
      "andaman-power-parts",
      "siam-bearings-motion",
      "lion-city-industrial-tech",
      "borneo-maintenance-works",
      "penang-precision-components",
      "red-river-procurement-network",
    ],
    substituteIds: ["aftermarket-injector-kit"],
    crisisProfile: {
      priceSpike: 58,
      logistics: 67,
      concentration: 71,
      notes: [
        "Generator part flows are delayed by port congestion and customs inspections.",
        "Most preferred distributors share the same aftermarket reman line.",
      ],
    },
  },
  {
    id: "aftermarket-injector-kit",
    name: "Aftermarket generator injector kit",
    shortLabel: "Aftermarket injector",
    category: "spare parts",
    unit: "set",
    description: "Qualified aftermarket spare part alternative for emergency uptime recovery.",
    technicalSpecs: "Aftermarket equivalent, tested reman components, warranty required.",
    basePrice: 695,
    baseLeadTime: 6,
    defaultQuantity: 4,
    baseMoq: 1,
    supplierIds: [
      "andaman-power-parts",
      "siam-bearings-motion",
      "borneo-maintenance-works",
      "lion-city-industrial-tech",
      "batam-circuit-supply",
      "red-river-procurement-network",
    ],
    substituteIds: ["generator-injector-kit"],
    crisisProfile: {
      priceSpike: 42,
      logistics: 49,
      concentration: 46,
      notes: [
        "Aftermarket channels offer faster replenishment but require compliance checks.",
        "Risk is lower than OEM-only sourcing during current shipping delays.",
      ],
    },
  },
  {
    id: "caustic-cleaner",
    name: "Caustic cleaning chemical concentrate",
    shortLabel: "Caustic cleaner",
    category: "chemicals",
    unit: "25L pail",
    description: "Heavy-duty alkaline cleaner used for degreasing production floors and tanks.",
    technicalSpecs: "High pH concentrate, diluted on site, food-contact not required.",
    basePrice: 62,
    baseLeadTime: 5,
    defaultQuantity: 36,
    baseMoq: 4,
    supplierIds: [
      "siam-cleanchem",
      "meranti-chem-solutions",
      "cebu-facility-essentials",
      "delta-lubricants-asia",
      "red-river-procurement-network",
    ],
    substituteIds: ["low-foam-degreaser"],
    crisisProfile: {
      priceSpike: 49,
      logistics: 41,
      concentration: 38,
      notes: [
        "Chemical freight surcharges are lifting replenishment costs.",
        "Hazmat lane availability is steady but premium-priced.",
      ],
    },
  },
  {
    id: "low-foam-degreaser",
    name: "Low-foam degreaser solvent",
    shortLabel: "Degreaser",
    category: "chemicals",
    unit: "20L pail",
    description: "Alternative low-foam cleaner suited for equipment washdown and daily cleaning.",
    technicalSpecs: "Low residue, low-foam, compatible with auto-scrubber equipment.",
    basePrice: 54,
    baseLeadTime: 4,
    defaultQuantity: 32,
    baseMoq: 4,
    supplierIds: [
      "siam-cleanchem",
      "meranti-chem-solutions",
      "cebu-facility-essentials",
      "delta-lubricants-asia",
      "red-river-procurement-network",
    ],
    substituteIds: ["caustic-cleaner"],
    crisisProfile: {
      priceSpike: 32,
      logistics: 34,
      concentration: 29,
      notes: [
        "Degreaser alternatives are better stocked than alkaline concentrates this week.",
        "Local chemical distributors can replenish faster for urgent jobs.",
      ],
    },
  },
  {
    id: "stm32-control-board",
    name: "STM32-compatible control board module",
    shortLabel: "Control board",
    category: "electronics",
    unit: "board",
    description: "Controller module used in retrofit machines, test rigs, and plant automation kits.",
    technicalSpecs: "STM32-compatible architecture, 5V/24V input, eight I/O channels minimum.",
    basePrice: 145,
    baseLeadTime: 9,
    defaultQuantity: 14,
    baseMoq: 2,
    supplierIds: [
      "penang-precision-components",
      "batam-circuit-supply",
      "lion-city-industrial-tech",
      "straits-industrial-supply",
      "red-river-procurement-network",
      "andaman-power-parts",
    ],
    substituteIds: ["industrial-io-controller"],
    crisisProfile: {
      priceSpike: 56,
      logistics: 63,
      concentration: 59,
      notes: [
        "Semiconductor lead times remain volatile on lower-volume controller SKUs.",
        "Air freight helps but materially raises urgent order costs.",
      ],
    },
  },
  {
    id: "industrial-io-controller",
    name: "Industrial I/O controller 24V",
    shortLabel: "I/O controller",
    category: "electronics",
    unit: "module",
    description: "Industrial controller alternative for machine integration when board-level parts are tight.",
    technicalSpecs: "24V input, DIN rail mount, Modbus capable, relay output included.",
    basePrice: 188,
    baseLeadTime: 6,
    defaultQuantity: 10,
    baseMoq: 2,
    supplierIds: [
      "penang-precision-components",
      "lion-city-industrial-tech",
      "batam-circuit-supply",
      "straits-industrial-supply",
      "red-river-procurement-network",
    ],
    substituteIds: ["stm32-control-board"],
    crisisProfile: {
      priceSpike: 39,
      logistics: 37,
      concentration: 35,
      notes: [
        "Module-based alternatives shorten integration time during component shortages.",
        "Pricing is higher, but supply depth is better across regional hubs.",
      ],
    },
  },
  {
    id: "hvac-filter",
    name: "HVAC air filter MERV 13",
    shortLabel: "HVAC filter",
    category: "maintenance",
    unit: "filter",
    description: "Replacement HVAC filter used in offices, control rooms, and clean process areas.",
    technicalSpecs: "MERV 13, 24x24x2, metal frame acceptable, multi-site delivery possible.",
    basePrice: 28,
    baseLeadTime: 5,
    defaultQuantity: 80,
    baseMoq: 10,
    supplierIds: [
      "straits-industrial-supply",
      "borneo-maintenance-works",
      "cebu-facility-essentials",
      "red-river-procurement-network",
      "mekong-safety-systems",
    ],
    substituteIds: [],
    crisisProfile: {
      priceSpike: 24,
      logistics: 29,
      concentration: 22,
      notes: [
        "Filter availability is stable thanks to regional stocking programs.",
        "Some suppliers are limiting urgent parcel dispatches on large orders.",
      ],
    },
  },
  {
    id: "copier-paper",
    name: "Copier paper A4 80gsm",
    shortLabel: "Copier paper",
    category: "office supplies",
    unit: "box",
    description: "Standard office paper for shared services, shipping docs, and invoice printing.",
    technicalSpecs: "A4, 80gsm, white, five reams per box, FSC preferred.",
    basePrice: 24,
    baseLeadTime: 3,
    defaultQuantity: 60,
    baseMoq: 8,
    supplierIds: [
      "horizon-paper-pack",
      "pacific-trade-link",
      "java-sourceone",
      "cebu-facility-essentials",
      "red-river-procurement-network",
      "sabah-safety-gear",
    ],
    substituteIds: [],
    crisisProfile: {
      priceSpike: 21,
      logistics: 18,
      concentration: 19,
      notes: [
        "Office supply lanes are stable, with modest pricing pressure only.",
        "FSC-preferred stock can take one extra day during peak demand.",
      ],
    },
  },
  {
    id: "thermal-labels",
    name: "Thermal labels 100x150mm",
    shortLabel: "Thermal labels",
    category: "packaging",
    unit: "roll case",
    description: "Warehouse shipping labels used for outbound logistics and pallet identification.",
    technicalSpecs: "Direct thermal, perforated, 100x150mm, three-inch core.",
    basePrice: 41,
    baseLeadTime: 4,
    defaultQuantity: 70,
    baseMoq: 6,
    supplierIds: [
      "horizon-paper-pack",
      "nusantara-packaging-hub",
      "java-sourceone",
      "pacific-trade-link",
      "red-river-procurement-network",
    ],
    substituteIds: ["corrugated-cartons"],
    crisisProfile: {
      priceSpike: 29,
      logistics: 23,
      concentration: 27,
      notes: [
        "Label converter capacity is healthy, helping absorb demand spikes.",
        "Adhesive resin costs are still trending upward.",
      ],
    },
  },
];

export const sampleRequestTemplates: SampleRequestTemplate[] = [
  {
    id: "lubricant-rush",
    label: "Industrial lubricant",
    itemId: "industrial-lubricant-a",
    quantity: 10,
    requiredInDays: 5,
    priority: "Critical",
    budgetMin: 4300,
    budgetMax: 5800,
    minSupplierRating: 84,
    notes: "Need equivalent spec for two production lines after refinery-linked price increases.",
  },
  {
    id: "packaging-restock",
    label: "Packaging materials",
    itemId: "corrugated-cartons",
    quantity: 120,
    requiredInDays: 8,
    priority: "High",
    budgetMin: 3600,
    budgetMax: 5200,
    minSupplierRating: 80,
    notes: "Urgent shipment backlog for export orders. Alternate sustainable material is acceptable.",
  },
  {
    id: "glove-shortfall",
    label: "Safety gloves",
    itemId: "nitrile-safety-gloves",
    quantity: 180,
    requiredInDays: 4,
    priority: "High",
    budgetMin: 1300,
    budgetMax: 2100,
    minSupplierRating: 82,
    notes: "Warehouse and line maintenance teams need immediate replenishment.",
  },
  {
    id: "generator-critical",
    label: "Diesel generator spare part",
    itemId: "generator-injector-kit",
    quantity: 3,
    requiredInDays: 6,
    priority: "Critical",
    budgetMin: 2100,
    budgetMax: 2900,
    minSupplierRating: 86,
    notes: "Backup generator uptime is business critical. Aftermarket option is acceptable with warranty.",
  },
  {
    id: "cleaning-reset",
    label: "Cleaning chemicals",
    itemId: "caustic-cleaner",
    quantity: 28,
    requiredInDays: 7,
    priority: "Medium",
    budgetMin: 1400,
    budgetMax: 2200,
    minSupplierRating: 80,
    notes: "Open to a lower-foam alternative if it can be deployed with current SOPs.",
  },
  {
    id: "electronics-line",
    label: "Electronic components",
    itemId: "stm32-control-board",
    quantity: 12,
    requiredInDays: 10,
    priority: "High",
    budgetMin: 1800,
    budgetMax: 2800,
    minSupplierRating: 85,
    notes: "Retrofit project cannot slip. Module-based alternative is acceptable if integration is faster.",
  },
];

export function getItemById(itemId: string) {
  return catalogItems.find((item) => item.id === itemId);
}

export function getSupplierById(supplierId: string) {
  return supplierProfiles.find((supplier) => supplier.id === supplierId);
}

export function inferCategoryFromText(
  itemName: string,
  explicitCategory?: Category,
  notes?: string,
): Category {
  if (explicitCategory) {
    return explicitCategory;
  }

  const haystack = normalizeSearchText(`${itemName} ${notes ?? ""}`);
  const scoredCategories = categoryKeywords.map((entry) => ({
    category: entry.category,
    score: entry.keywords.reduce(
      (sum, keyword) => sum + (haystack.includes(keyword) ? 1 : 0),
      0,
    ),
  }));
  const best = scoredCategories.sort((left, right) => right.score - left.score)[0];

  return best && best.score > 0 ? best.category : "maintenance";
}

export function getCategoryBenchmarkItem(category: Category) {
  return getItemById(categoryBenchmarks[category]);
}

function findClosestCatalogItem(query: string, preferredCategory?: Category) {
  const normalizedQuery = normalizeSearchText(query);
  const tokens = tokenizeSearchText(query);

  const matches = catalogItems
    .map((item) => {
      const haystack = normalizeSearchText(
        [item.id, item.name, item.shortLabel, item.category, item.description, item.technicalSpecs].join(" "),
      );

      let score = 0;

      if (haystack.includes(normalizedQuery)) {
        score += 30;
      }

      if (preferredCategory && item.category === preferredCategory) {
        score += 12;
      }

      for (const token of tokens) {
        if (haystack.includes(token)) {
          score += 5;
        }
      }

      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  return matches[0]?.item;
}

function getSupplierFitScore(supplier: SupplierProfile, query: string) {
  const tokens = tokenizeSearchText(query);
  const specialtyScore =
    supplier.specialtyItems?.reduce((sum, specialtyItemId) => {
      const specialtyItem = getItemById(specialtyItemId);

      if (!specialtyItem) {
        return sum;
      }

      const haystack = normalizeSearchText(
        `${specialtyItem.id} ${specialtyItem.name} ${specialtyItem.shortLabel}`,
      );

      return (
        sum +
        tokens.reduce(
          (tokenSum, token) => tokenSum + (haystack.includes(token) ? 8 : 0),
          0,
        )
      );
    }, 0) ?? 0;

  return specialtyScore + supplier.baseReliability - supplier.riskIndex * 18;
}

function buildQuotesFromCatalogItem(item: CatalogItem): SupplierQuote[] {
  return item.supplierIds
    .map((supplierId) => {
      const supplier = getSupplierById(supplierId);

      if (!supplier) {
        return null;
      }

      const specialtyBoost = supplier.specialtyItems?.includes(item.id) ? 1 : 0;
      const priceNoise = seededFraction(`${item.id}:${supplier.id}:price`);
      const leadNoise = seededFraction(`${item.id}:${supplier.id}:lead`);
      const stockNoise = seededFraction(`${item.id}:${supplier.id}:stock`);
      const riskNoise = seededFraction(`${item.id}:${supplier.id}:risk`);
      const moqNoise = seededFraction(`${item.id}:${supplier.id}:moq`);

      const unitPrice = Math.round(
        item.basePrice *
          supplier.priceIndex *
          (0.92 + priceNoise * 0.18 - specialtyBoost * 0.03),
      );

      const leadTimeDays = clamp(
        Math.round(
          item.baseLeadTime * supplier.speedFactor * (0.86 + leadNoise * 0.28) +
            item.crisisProfile.logistics / 32 -
            specialtyBoost,
        ),
        1,
        24,
      );

      const reliability = clamp(
        Math.round(
          supplier.baseReliability +
            specialtyBoost * 4 -
            item.crisisProfile.logistics / 18 +
            (stockNoise - 0.5) * 10,
        ),
        64,
        98,
      );

      const stockAvailability = clamp(
        Math.round(
          88 -
            item.crisisProfile.concentration * 0.34 -
            item.crisisProfile.priceSpike * 0.18 -
            supplier.riskIndex * 12 +
            stockNoise * 24 +
            specialtyBoost * 6,
        ),
        18,
        100,
      );

      const riskScore = clamp(
        Math.round(
          supplier.riskIndex * 55 +
            item.crisisProfile.priceSpike * 0.22 +
            item.crisisProfile.logistics * 0.28 +
            riskNoise * 12 -
            specialtyBoost * 4,
        ),
        10,
        92,
      );

      const moq = Math.max(
        1,
        Math.round(item.baseMoq * (0.85 + moqNoise * 0.6 + supplier.priceIndex * 0.08)),
      );

      const deliveryConfidence = clamp(
        Math.round(
          supplier.deliveryConfidence -
            riskScore * 0.1 +
            (1 - leadNoise) * 6 +
            specialtyBoost * 3,
        ),
        55,
        97,
      );

      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        itemId: item.id,
        unitPrice,
        leadTimeDays,
        reliability,
        stockAvailability,
        region: supplier.region,
        country: supplier.country,
        riskScore,
        riskLevel: riskLevelFromScore(riskScore),
        moq,
        deliveryConfidence,
        sustainabilityTag: supplier.sustainabilityTag,
        complianceTag: supplier.complianceTag,
      };
    })
    .filter((quote): quote is SupplierQuote => quote !== null);
}

export function resolveItemProfileForRequest(request: ProcurementRequest): CatalogItem {
  const directItem = getItemById(request.itemId);

  if (directItem) {
    return directItem;
  }

  const inferredCategory = inferCategoryFromText(request.itemName, request.category, request.notes);
  const benchmarkItem =
    findClosestCatalogItem(`${request.itemName} ${request.notes}`, inferredCategory) ??
    getCategoryBenchmarkItem(inferredCategory);

  if (!benchmarkItem) {
    throw new Error(`Unable to resolve an item profile for "${request.itemName}".`);
  }

  const estimatedUnitPrice =
    request.quantity > 0
      ? Math.max(
          1,
          Math.round(((request.budgetMin + request.budgetMax) / 2) / Math.max(request.quantity, 1)),
        )
      : benchmarkItem.basePrice;
  const supplierIds = supplierProfiles
    .filter((supplier) => supplier.supportedCategories.includes(inferredCategory))
    .sort(
      (left, right) =>
        getSupplierFitScore(right, request.itemName) - getSupplierFitScore(left, request.itemName),
    )
    .map((supplier) => supplier.id);
  const substituteIds = Array.from(
    new Set(
      [benchmarkItem.id, ...benchmarkItem.substituteIds]
        .filter((itemId) => itemId !== request.itemId)
        .slice(0, 3),
    ),
  );

  return {
    id: request.itemId,
    name: request.itemName,
    shortLabel: buildShortLabel(request.itemName),
    category: inferredCategory,
    unit: inferUnitFromText(request.itemName, benchmarkItem.unit),
    description: request.notes || `Ad hoc sourcing request for ${request.itemName}.`,
    technicalSpecs: request.notes || benchmarkItem.technicalSpecs,
    basePrice: clamp(
      estimatedUnitPrice,
      1,
      Math.max(benchmarkItem.basePrice * 6, estimatedUnitPrice * 2, 5000),
    ),
    baseLeadTime: benchmarkItem.baseLeadTime,
    defaultQuantity: request.quantity,
    baseMoq: benchmarkItem.baseMoq,
    supplierIds,
    substituteIds,
    crisisProfile: benchmarkItem.crisisProfile,
  };
}

export function buildQuotesForItem(itemId: string): SupplierQuote[] {
  const item = getItemById(itemId);

  if (!item) {
    return [];
  }

  return buildQuotesFromCatalogItem(item);
}

export function buildQuotesForRequest(request: ProcurementRequest): SupplierQuote[] {
  return buildQuotesFromCatalogItem(resolveItemProfileForRequest(request));
}

export function buildSeedRequests(): ProcurementRequest[] {
  return [
    {
      id: "req-lubricant",
      itemId: "industrial-lubricant-a",
      itemName: "Industrial lubricant A ISO 68",
      category: "maintenance",
      quantity: 10,
      requiredBy: futureDate(5),
      budgetMin: 4300,
      budgetMax: 5800,
      priority: "Critical",
      minSupplierRating: 84,
      notes: "Need equivalent spec for two production lines after an urgent maintenance stop.",
      createdAt: futureDate(-1),
    },
    {
      id: "req-cartons",
      itemId: "corrugated-cartons",
      itemName: "Corrugated packaging cartons 400x300mm",
      category: "packaging",
      quantity: 120,
      requiredBy: futureDate(8),
      budgetMin: 3600,
      budgetMax: 5200,
      priority: "High",
      minSupplierRating: 80,
      notes: "Export order backlog needs a second source outside the current port lane.",
      createdAt: futureDate(-2),
    },
    {
      id: "req-gloves",
      itemId: "nitrile-safety-gloves",
      itemName: "Nitrile safety gloves 8 mil",
      category: "safety equipment",
      quantity: 180,
      requiredBy: futureDate(4),
      budgetMin: 1300,
      budgetMax: 2100,
      priority: "High",
      minSupplierRating: 82,
      notes: "Need size mix availability for both warehouse and maintenance teams.",
      createdAt: futureDate(-3),
    },
    {
      id: "req-generator",
      itemId: "generator-injector-kit",
      itemName: "Diesel generator fuel injector kit",
      category: "spare parts",
      quantity: 3,
      requiredBy: futureDate(6),
      budgetMin: 2100,
      budgetMax: 2900,
      priority: "Critical",
      minSupplierRating: 86,
      notes: "Generator uptime is mandatory ahead of a forecasted grid reliability issue.",
      createdAt: futureDate(-1),
    },
    {
      id: "req-cleaner",
      itemId: "caustic-cleaner",
      itemName: "Caustic cleaning chemical concentrate",
      category: "chemicals",
      quantity: 28,
      requiredBy: futureDate(7),
      budgetMin: 1400,
      budgetMax: 2200,
      priority: "Medium",
      minSupplierRating: 80,
      notes: "Open to a lower-foam alternative if it reduces freight risk.",
      createdAt: futureDate(-4),
    },
    {
      id: "req-board",
      itemId: "stm32-control-board",
      itemName: "STM32-compatible control board module",
      category: "electronics",
      quantity: 12,
      requiredBy: futureDate(10),
      budgetMin: 1800,
      budgetMax: 2800,
      priority: "High",
      minSupplierRating: 85,
      notes: "Retrofit project needs a credible second source for controller modules.",
      createdAt: futureDate(-2),
    },
    {
      id: "req-paper",
      itemId: "copier-paper",
      itemName: "Copier paper A4 80gsm",
      category: "office supplies",
      quantity: 45,
      requiredBy: futureDate(9),
      budgetMin: 900,
      budgetMax: 1300,
      priority: "Low",
      minSupplierRating: 78,
      notes: "Bundle with other facilities supplies if service level remains stable.",
      createdAt: futureDate(-5),
    },
  ];
}
