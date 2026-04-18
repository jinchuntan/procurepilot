import { buildSeedRequests, defaultWeights } from "@/lib/data";
import { ProcurementRequest, Weights } from "@/lib/types";

const REQUESTS_KEY = "procurepilot.requests";
const WEIGHTS_KEY = "procurepilot.weights";

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadRequests() {
  if (!isBrowser()) {
    return buildSeedRequests();
  }

  try {
    const raw = window.localStorage.getItem(REQUESTS_KEY);

    if (!raw) {
      const seeded = buildSeedRequests();
      window.localStorage.setItem(REQUESTS_KEY, JSON.stringify(seeded));
      return seeded;
    }

    return JSON.parse(raw) as ProcurementRequest[];
  } catch {
    return buildSeedRequests();
  }
}

export function saveRequests(requests: ProcurementRequest[]) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
}

export function loadWeights() {
  if (!isBrowser()) {
    return defaultWeights;
  }

  try {
    const raw = window.localStorage.getItem(WEIGHTS_KEY);

    if (!raw) {
      window.localStorage.setItem(WEIGHTS_KEY, JSON.stringify(defaultWeights));
      return defaultWeights;
    }

    return {
      ...defaultWeights,
      ...(JSON.parse(raw) as Partial<Weights>),
    } satisfies Weights;
  } catch {
    return defaultWeights;
  }
}

export function saveWeights(weights: Weights) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(WEIGHTS_KEY, JSON.stringify(weights));
}
