"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ExternalLink,
  LoaderCircle,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import { LiquidMetalButton } from "@/components/liquid-metal-button";
import { defaultWeights } from "@/lib/data";
import { formatDate, formatDays, formatPercent } from "@/lib/format";
import { useLocation } from "@/lib/location-context";
import {
  Priority,
  ProcurementAssessment,
  RecommendationKey,
  RiskLevel,
  Weights,
} from "@/lib/types";

type ChatMessage = {
  role: "assistant" | "user";
  text: string;
};

type InterviewStep =
  | "item"
  | "quantity"
  | "requiredBy"
  | "budget"
  | "priority"
  | "rating"
  | "notes"
  | "recommendations";

type InterviewDraft = {
  itemName: string;
  quantity: number | null;
  requiredBy: string;
  budgetMin: number | null;
  budgetMax: number | null;
  priority: Priority;
  minSupplierRating: number | null;
  notes: string;
};

const interviewDefaults: InterviewDraft = {
  itemName: "",
  quantity: null,
  requiredBy: "",
  budgetMin: null,
  budgetMax: null,
  priority: "High",
  minSupplierRating: 80,
  notes: "",
};

const stepFallbacks: Record<Exclude<InterviewStep, "recommendations">, string> = {
  item: "What item do you need to procure?",
  quantity: "How many units do you need?",
  requiredBy: "What is the required-by date for this order?",
  budget: "What budget range should I work within?",
  priority: "How urgent is this request: low, medium, high, or critical?",
  rating: "What minimum supplier rating should I keep as the floor?",
  notes: 'Any notes or technical specs I should carry into the recommendation? You can also type "skip".',
};

const weightLabels: Array<{ key: keyof Weights; label: string }> = [
  { key: "price", label: "Price" },
  { key: "leadTime", label: "Lead time" },
  { key: "reliability", label: "Reliability" },
  { key: "stockAvailability", label: "Stock" },
  { key: "supplierRisk", label: "Risk" },
  { key: "urgencyFit", label: "Urgency fit" },
];

function riskBadge(level: RiskLevel) {
  if (level === "High") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (level === "Medium") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function supplierMonogram(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function buildStateSummary(draft: InterviewDraft) {
  return [
    draft.itemName ? `item=${draft.itemName}` : "item=missing",
    draft.quantity ? `quantity=${draft.quantity}` : "quantity=missing",
    draft.requiredBy ? `requiredBy=${draft.requiredBy}` : "requiredBy=missing",
    draft.budgetMin !== null && draft.budgetMax !== null
      ? `budget=${draft.budgetMin}-${draft.budgetMax}`
      : "budget=missing",
    `priority=${draft.priority}`,
    draft.minSupplierRating ? `minRating=${draft.minSupplierRating}` : "minRating=missing",
    draft.notes ? `notes=${draft.notes}` : "notes=not provided yet",
  ].join("; ");
}

function buildInterviewPrompt(
  step: Exclude<InterviewStep, "recommendations">,
  draft: InterviewDraft,
  latestAnswer: string,
  correction?: string,
) {
  const stepGoals: Record<Exclude<InterviewStep, "recommendations">, string> = {
    item: "Start the interview and ask what item the buyer needs to procure.",
    quantity: "Ask only for the quantity required.",
    requiredBy: "Ask only for the required-by date. Accept plain dates or phrases like tomorrow or next week.",
    budget: "Ask only for the budget range. Accept either a range or a budget cap.",
    priority: "Ask only for the urgency level: low, medium, high, or critical.",
    rating: "Ask only for the minimum supplier rating threshold as a number.",
    notes: 'Ask for notes or technical specs. Mention that the buyer can type "skip" if there are no extra constraints.',
  };

  return [
    "You are ProcurePilot, a concise AI procurement copilot interviewing a buyer.",
    `Current interview state: ${buildStateSummary(draft)}.`,
    correction
      ? `The last answer could not be used because ${correction}. Ask for the same field again.`
      : stepGoals[step],
    latestAnswer ? `Latest buyer answer: "${latestAnswer}".` : "No buyer answer has been provided yet.",
    "Respond with one short question only. No bullets. No extra explanation.",
  ].join(" ");
}

function buildRecommendationPrompt(assessment: ProcurementAssessment) {
  const options = [
    assessment.recommendations.overall,
    assessment.recommendations.lowCost,
    assessment.recommendations.fastest,
    assessment.recommendations.balanced,
  ]
    .map((entry) => `${entry.label}: ${entry.supplier.supplierName}`)
    .join("; ");

  return [
    "You are ProcurePilot, continuing the buyer conversation after the shortlist has been prepared.",
    `Request: ${assessment.request.quantity} units of ${assessment.request.itemName}, required by ${assessment.request.requiredBy}, budget ceiling USD ${assessment.request.budgetMax}.`,
    `Top options: ${options}.`,
    "Explain briefly that the recommendation tiles are ready below and ask the buyer to choose one if they want you to open a live negotiation room.",
    "Respond in no more than two short sentences.",
  ].join(" ");
}

function futureDate(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

function getSuggestedReplies(step: InterviewStep, draft: InterviewDraft) {
  if (step === "recommendations") {
    return [];
  }

  if (step === "item") {
    return [
      "Industrial lubricant for compressors",
      "RFID shipping label rolls",
      "Diesel generator injector kit",
      "Safety gloves for warehouse staff",
    ];
  }

  if (step === "quantity") {
    const normalizedItem = draft.itemName.toLowerCase();

    if (/(glove|mask|ppe|helmet)/.test(normalizedItem)) {
      return ["200 units", "500 units", "1000 units"];
    }

    if (/(label|carton|packaging|paper|box)/.test(normalizedItem)) {
      return ["24 units", "50 units", "120 units"];
    }

    return ["10 units", "25 units", "50 units"];
  }

  if (step === "requiredBy") {
    return ["Tomorrow", futureDate(3), "Next week"];
  }

  if (step === "budget") {
    return ["Budget cap 5,000", "3,000 to 4,500", "Under 10,000"];
  }

  if (step === "priority") {
    return ["Critical", "High", "Medium"];
  }

  if (step === "rating") {
    return ["80", "85", "90"];
  }

  return [
    "Equivalent substitute is acceptable",
    "Keep this with one supplier if possible",
    "Need delivery before our maintenance shutdown",
    "skip",
  ];
}

function parseQuantity(value: string) {
  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);

  if (!match) {
    return null;
  }

  const quantity = Number(match[1]);

  return Number.isFinite(quantity) && quantity > 0 ? Math.round(quantity) : null;
}

function parseRequiredBy(value: string) {
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase();

  if (!trimmed) {
    return null;
  }

  if (normalized === "today") {
    return futureDate(0);
  }

  if (normalized === "tomorrow") {
    return futureDate(1);
  }

  if (normalized === "next week") {
    return futureDate(7);
  }

  const relativeMatch = normalized.match(/(?:in|within)\s+(\d+)\s+day/);

  if (relativeMatch) {
    return futureDate(Number(relativeMatch[1]));
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function parseBudget(value: string) {
  const numbers = Array.from(value.matchAll(/\d[\d,]*(?:\.\d+)?/g)).map((match) =>
    Number(match[0].replace(/,/g, "")),
  );

  if (!numbers.length || numbers.some((entry) => !Number.isFinite(entry))) {
    return null;
  }

  if (numbers.length >= 2) {
    const [budgetMin, budgetMax] = numbers.slice(0, 2).sort((left, right) => left - right);
    return { budgetMin, budgetMax };
  }

  const singleValue = numbers[0];
  const normalized = value.toLowerCase();

  if (/(under|below|cap|max|ceiling|up to)/.test(normalized)) {
    return {
      budgetMin: Math.round(singleValue * 0.85),
      budgetMax: singleValue,
    };
  }

  if (/(minimum|min|floor|from)/.test(normalized)) {
    return {
      budgetMin: singleValue,
      budgetMax: Math.round(singleValue * 1.15),
    };
  }

  return {
    budgetMin: Math.round(singleValue * 0.9),
    budgetMax: Math.round(singleValue * 1.1),
  };
}

function parsePriority(value: string): Priority | null {
  const normalized = value.toLowerCase();

  if (/(critical|urgent|asap|immediately)/.test(normalized)) {
    return "Critical";
  }

  if (/(high|soon|important)/.test(normalized)) {
    return "High";
  }

  if (/(medium|normal|standard)/.test(normalized)) {
    return "Medium";
  }

  if (/(low|flexible|not urgent)/.test(normalized)) {
    return "Low";
  }

  return null;
}

function parseMinimumRating(value: string) {
  if (/default/i.test(value)) {
    return 80;
  }

  const match = value.match(/(\d{2})/);

  if (!match) {
    return null;
  }

  const rating = Number(match[1]);

  return rating >= 60 && rating <= 99 ? rating : null;
}

async function postAgentMessage(message: string, threadId?: string) {
  const response = await fetch("/api/agent/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      threadId,
    }),
  });
  const data = (await response.json()) as {
    threadId?: string;
    reply?: string;
    error?: string;
  };

  if (!response.ok || !data.reply) {
    throw new Error(data.error ?? "Failed to get a Lua agent reply.");
  }

  return {
    threadId: data.threadId,
    reply: data.reply,
  };
}

function getRecommendationEntries(assessment: ProcurementAssessment) {
  return [
    { key: "overall" as const, entry: assessment.recommendations.overall },
    { key: "lowCost" as const, entry: assessment.recommendations.lowCost },
    { key: "fastest" as const, entry: assessment.recommendations.fastest },
    { key: "balanced" as const, entry: assessment.recommendations.balanced },
  ];
}

function SupplierComparisonTable({
  assessment,
  formatCurrency,
}: Readonly<{
  assessment: ProcurementAssessment;
  formatCurrency: (value: number) => string;
}>) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
          <tr>
            <th className="px-3 py-3">Supplier</th>
            <th className="px-3 py-3">Score</th>
            <th className="px-3 py-3">Total cost</th>
            <th className="px-3 py-3">Lead</th>
            <th className="px-3 py-3">Reliability</th>
            <th className="px-3 py-3">Risk</th>
          </tr>
        </thead>
        <tbody>
          {assessment.scoredQuotes.map((quote, index) => (
            <tr
              key={quote.supplierId}
              className={
                index === 0
                  ? "bg-slate-950 text-white"
                  : "border-t border-slate-100 text-slate-900"
              }
            >
              <td className={`px-3 py-4 ${index === 0 ? "rounded-l-2xl" : ""}`}>
                <div className="font-semibold">{quote.supplierName}</div>
                <div
                  className={`mt-1 text-xs ${index === 0 ? "text-slate-300" : "text-slate-500"}`}
                >
                  {quote.region}
                </div>
                {quote.flags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {quote.flags.map((flag) => (
                      <span
                        key={flag}
                        className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                          index === 0
                            ? "border-white/15 bg-white/8 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </td>
              <td className="px-3 py-4 font-semibold">{quote.finalScore}</td>
              <td className="px-3 py-4">{formatCurrency(quote.totalCost)}</td>
              <td className="px-3 py-4">{formatDays(quote.leadTimeDays)}</td>
              <td className="px-3 py-4">{formatPercent(quote.reliability)}</td>
              <td className={`px-3 py-4 ${index === 0 ? "rounded-r-2xl" : ""}`}>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${riskBadge(
                    quote.riskLevel,
                  )}`}
                >
                  {quote.riskLevel}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryBlock({
  title,
  value,
  hint,
}: Readonly<{
  title: string;
  value: string;
  hint: string;
}>) {
  return (
    <div className="rounded-[24px] border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">{title}</p>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-white/60">{hint}</p>
    </div>
  );
}

export function AgentConsole({
  initialRequestId,
}: Readonly<{
  initialRequestId?: string;
}>) {
  const location = useLocation();
  const formatCurrency = useMemo(() => {
    const currency = location === "Malaysia" ? "MYR" : "SGD";
    const locale = location === "Malaysia" ? "ms-MY" : "en-SG";

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format;
  }, [location]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [step, setStep] = useState<InterviewStep>("item");
  const [draft, setDraft] = useState<InterviewDraft>(interviewDefaults);
  const [threadId, setThreadId] = useState<string | undefined>();
  const [questionPending, setQuestionPending] = useState(false);
  const [assessmentPending, setAssessmentPending] = useState(false);
  const [recommendationPending, setRecommendationPending] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<ProcurementAssessment | null>(null);
  const [weights, setWeights] = useState<Weights>(defaultWeights);
  const deferredWeights = useDeferredValue(weights);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecommendationKey, setSelectedRecommendationKey] =
    useState<RecommendationKey | null>(null);
  const [negotiationRoomHref, setNegotiationRoomHref] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [sending, setSending] = useState(false);
  const reweightReadyRef = useRef(false);
  const initializedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function appendAgentQuestion(
    nextStep: Exclude<InterviewStep, "recommendations">,
    nextDraft: InterviewDraft,
    latestAnswer: string,
    correction?: string,
  ) {
    try {
      setQuestionPending(true);
      const data = await postAgentMessage(
        buildInterviewPrompt(nextStep, nextDraft, latestAnswer, correction),
        threadId,
      );

      setThreadId(data.threadId);
      setMessages((current) => [...current, { role: "assistant", text: data.reply }]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: correction ? `${correction} ${stepFallbacks[nextStep]}` : stepFallbacks[nextStep],
        },
      ]);
    } finally {
      setQuestionPending(false);
    }
  }

  async function bootConversation() {
    setMessages([]);
    setInputValue("");
    setStep("item");
    setDraft(interviewDefaults);
    setThreadId(undefined);
    setRequestId(null);
    setAssessment(null);
    setError(null);
    setSelectedRecommendationKey(null);
    setNegotiationRoomHref(null);
    setShowAnalysis(false);
    setWeights(defaultWeights);
    reweightReadyRef.current = false;

    await appendAgentQuestion("item", interviewDefaults, "");
  }

  async function loadExistingRequest(existingRequestId: string) {
    try {
      setAssessmentPending(true);
      setError(null);

      const response = await fetch("/api/agent/assess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: existingRequestId,
          weights: defaultWeights,
        }),
      });
      const data = (await response.json()) as ProcurementAssessment | { error: string };

      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Failed to load saved request.");
      }

      setRequestId(existingRequestId);
      setAssessment(data);
      setStep("recommendations");
      setShowAnalysis(true);
      setMessages([
        {
          role: "assistant",
          text: `I loaded your saved brief for ${data.request.itemName}. The recommendation tiles and comparison are ready below, and I can open a live negotiation room once you pick one option.`,
        },
      ]);
      reweightReadyRef.current = false;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load saved request.");
      await bootConversation();
    } finally {
      setAssessmentPending(false);
    }
  }

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    const timeoutId = window.setTimeout(() => {
      if (initialRequestId) {
        void loadExistingRequest(initialRequestId);
        return;
      }

      void bootConversation();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRequestId]);

  useEffect(() => {
    if (!requestId) {
      return;
    }

    if (!reweightReadyRef.current) {
      reweightReadyRef.current = true;
      return;
    }

    const controller = new AbortController();

    async function refreshAssessment() {
      try {
        setAssessmentPending(true);
        setError(null);

        const response = await fetch("/api/agent/assess", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestId,
            weights: deferredWeights,
          }),
          signal: controller.signal,
        });
        const data = (await response.json()) as ProcurementAssessment | { error: string };

        if (!response.ok || "error" in data) {
          throw new Error("error" in data ? data.error : "Failed to refresh recommendations.");
        }

        setAssessment(data);
      } catch (refreshError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          refreshError instanceof Error
            ? refreshError.message
            : "Failed to refresh recommendations.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setAssessmentPending(false);
        }
      }
    }

    void refreshAssessment();

    return () => controller.abort();
  }, [deferredWeights, requestId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, questionPending, assessmentPending]);

  async function buildRecommendations(nextDraft: InterviewDraft) {
    try {
      setAssessmentPending(true);
      setError(null);
      setSelectedRecommendationKey(null);
      setNegotiationRoomHref(null);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: "I'm building the supplier shortlist now and I'll surface the strongest options below.",
        },
      ]);

      const createResponse = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemName: nextDraft.itemName,
          quantity: nextDraft.quantity,
          requiredBy: nextDraft.requiredBy,
          budgetMin: nextDraft.budgetMin,
          budgetMax: nextDraft.budgetMax,
          priority: nextDraft.priority,
          minSupplierRating: nextDraft.minSupplierRating,
          notes: nextDraft.notes,
        }),
      });
      const created = (await createResponse.json()) as {
        request?: { id: string };
        error?: string;
      };

      if (!createResponse.ok || !created.request?.id) {
        throw new Error(created.error ?? "Failed to create the procurement request.");
      }

      const nextRequestId = created.request.id;
      const assessmentResponse = await fetch("/api/agent/assess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: nextRequestId,
          weights: defaultWeights,
        }),
      });
      const assessmentData = (await assessmentResponse.json()) as
        | ProcurementAssessment
        | { error: string };

      if (!assessmentResponse.ok || "error" in assessmentData) {
        throw new Error(
          "error" in assessmentData
            ? assessmentData.error
            : "Failed to generate supplier recommendations.",
        );
      }

      setRequestId(nextRequestId);
      setAssessment(assessmentData);
      setStep("recommendations");
      setShowAnalysis(true);
      reweightReadyRef.current = false;

      try {
        const data = await postAgentMessage(buildRecommendationPrompt(assessmentData), threadId);
        setThreadId(data.threadId);
        setMessages((current) => [...current, { role: "assistant", text: data.reply }]);
      } catch {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            text: "The recommendation tiles are ready below. Pick one if you want me to open a live negotiation room where you can play the seller and I'll negotiate as the buyer.",
          },
        ]);
      }
    } catch (assessmentError) {
      const message =
        assessmentError instanceof Error
          ? assessmentError.message
          : "Failed to build recommendations.";

      setError(message);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: `I hit a problem while building the shortlist. ${message}`,
        },
      ]);
    } finally {
      setAssessmentPending(false);
    }
  }

  async function submitAnswer(answer: string) {
    if (!answer || questionPending || assessmentPending) {
      return;
    }

    setMessages((current) => [...current, { role: "user", text: answer }]);
    setInputValue("");
    setError(null);
    setSending(true);
    window.setTimeout(() => setSending(false), 350);

    if (step === "item") {
      const nextDraft = { ...draft, itemName: answer };
      setDraft(nextDraft);
      setStep("quantity");
      await appendAgentQuestion("quantity", nextDraft, answer);
      return;
    }

    if (step === "quantity") {
      const quantity = parseQuantity(answer);

      if (!quantity) {
        await appendAgentQuestion("quantity", draft, answer, "I still need a valid numeric quantity.");
        return;
      }

      const nextDraft = { ...draft, quantity };
      setDraft(nextDraft);
      setStep("requiredBy");
      await appendAgentQuestion("requiredBy", nextDraft, answer);
      return;
    }

    if (step === "requiredBy") {
      const requiredBy = parseRequiredBy(answer);

      if (!requiredBy) {
        await appendAgentQuestion(
          "requiredBy",
          draft,
          answer,
          "I could not read the required-by date from that answer.",
        );
        return;
      }

      const nextDraft = { ...draft, requiredBy };
      setDraft(nextDraft);
      setStep("budget");
      await appendAgentQuestion("budget", nextDraft, answer);
      return;
    }

    if (step === "budget") {
      const budget = parseBudget(answer);

      if (!budget || budget.budgetMax < budget.budgetMin) {
        await appendAgentQuestion(
          "budget",
          draft,
          answer,
          "I need either a budget range or a clear budget cap.",
        );
        return;
      }

      const nextDraft = {
        ...draft,
        budgetMin: budget.budgetMin,
        budgetMax: budget.budgetMax,
      };
      setDraft(nextDraft);
      setStep("priority");
      await appendAgentQuestion("priority", nextDraft, answer);
      return;
    }

    if (step === "priority") {
      const priority = parsePriority(answer);

      if (!priority) {
        await appendAgentQuestion(
          "priority",
          draft,
          answer,
          "I need the urgency level as low, medium, high, or critical.",
        );
        return;
      }

      const nextDraft = { ...draft, priority };
      setDraft(nextDraft);
      setStep("rating");
      await appendAgentQuestion("rating", nextDraft, answer);
      return;
    }

    if (step === "rating") {
      const minSupplierRating = parseMinimumRating(answer);

      if (!minSupplierRating) {
        await appendAgentQuestion(
          "rating",
          draft,
          answer,
          "I need the minimum supplier rating as a number between 60 and 99.",
        );
        return;
      }

      const nextDraft = { ...draft, minSupplierRating };
      setDraft(nextDraft);
      setStep("notes");
      await appendAgentQuestion("notes", nextDraft, answer);
      return;
    }

    if (step === "notes") {
      const nextDraft = {
        ...draft,
        notes: /^skip$/i.test(answer) ? "" : answer,
      };
      setDraft(nextDraft);
      await buildRecommendations(nextDraft);
      return;
    }

    if (step === "recommendations") {
      try {
        setQuestionPending(true);
        const data = await postAgentMessage(answer, threadId);
        setThreadId(data.threadId);
        setMessages((current) => [...current, { role: "assistant", text: data.reply }]);
      } catch {
        setMessages((current) => [
          ...current,
          { role: "assistant", text: "Sorry, I couldn't process that. Please try again." },
        ]);
      } finally {
        setQuestionPending(false);
      }
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitAnswer(inputValue.trim());
  }

  function handleOptionClick(option: string) {
    void submitAnswer(option);
  }

  async function handleOpenNegotiationRoom(recommendationKey: RecommendationKey) {
    if (!requestId || recommendationPending) {
      return;
    }

    try {
      setRecommendationPending(true);
      setSelectedRecommendationKey(recommendationKey);
      setError(null);

      const response = await fetch("/api/agent/negotiation/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          recommendationKey,
        }),
      });
      const data = (await response.json()) as {
        href?: string;
        error?: string;
      };

      if (!response.ok || !data.href) {
        throw new Error(data.error ?? "Failed to open the negotiation room.");
      }

      setNegotiationRoomHref(data.href);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: "The live seller room is ready. Open it below, play the supplier, and I'll negotiate there as the buyer until we close the deal.",
        },
      ]);
    } catch (roomError) {
      setError(roomError instanceof Error ? roomError.message : "Failed to open negotiation room.");
    } finally {
      setRecommendationPending(false);
    }
  }

  const recommendationEntries = assessment ? getRecommendationEntries(assessment) : [];
  const inputPlaceholder =
    step === "notes"
      ? 'Type your notes or "skip"'
      : step === "recommendations"
        ? "Ask a follow-up question..."
        : "Type your answer here";
  const currentStepOptions = step !== "recommendations" ? getSuggestedReplies(step, draft) : [];

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-200/80">
            Interactive Sourcing Flow
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-white">
            Let ProcurePilot interview the buyer and build the shortlist live.
          </h2>
        </div>

        <button
          type="button"
          onClick={() => void bootConversation()}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <RotateCcw className="h-4 w-4" />
          Restart flow
        </button>
      </div>

      <div className="rounded-[30px] border border-white/10 bg-black/35 p-4 shadow-[0_30px_80px_rgba(2,6,23,0.28)] backdrop-blur sm:p-5">
        <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <p
                className={`max-w-[88%] rounded-[22px] px-4 py-3 text-sm leading-6 ${
                  message.role === "assistant"
                    ? "border border-white/10 bg-white/6 text-white/82"
                    : "bg-white/14 text-white"
                }`}
              >
                {message.text}
              </p>
            </div>
          ))}

          {questionPending || assessmentPending ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/75">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              {assessmentPending ? "Building your shortlist..." : "Thinking..."}
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        {currentStepOptions.length > 0 && step !== "recommendations" ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {currentStepOptions.map((option, index) => (
              <button
                key={option}
                type="button"
                onClick={() => handleOptionClick(option)}
                disabled={questionPending || assessmentPending}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white/60">
                  {String.fromCharCode(65 + index)}
                </span>
                {option}
              </button>
            ))}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/6 px-4 py-3">
          <input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            disabled={questionPending || assessmentPending}
            placeholder={inputPlaceholder}
            className="flex-1 bg-transparent py-1 text-sm text-white outline-none placeholder:text-white/32"
          />
          <LiquidMetalButton disabled={questionPending || assessmentPending} sending={sending} />
        </form>
      </div>

      {error ? (
        <div className="rounded-[20px] border border-rose-300/40 bg-rose-500/20 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {assessment ? (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-white/10 bg-black/35 p-5 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">
                Procurement Brief
              </p>
              <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl text-white">
                {assessment.request.itemName}
              </h3>
              <p className="mt-3 text-sm leading-6 text-white/70">{assessment.summary}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <SummaryBlock
                  title="Required by"
                  value={formatDate(assessment.request.requiredBy)}
                  hint="Target date collected during the interview flow."
                />
                <SummaryBlock
                  title="Budget ceiling"
                  value={formatCurrency(assessment.request.budgetMax)}
                  hint="Current budget envelope used in scoring."
                />
                <SummaryBlock
                  title="Priority"
                  value={assessment.request.priority}
                  hint="Urgency fit changes the ranking and fallback logic."
                />
                <SummaryBlock
                  title="Notes"
                  value={assessment.request.notes || "No extra notes"}
                  hint="Extra context stays attached to the recommendation set."
                />
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/92 p-5 text-slate-950 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Best Overall Supplier
              </p>
              <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl">
                {assessment.recommendations.overall.supplier.supplierName}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {assessment.recommendations.overall.reason}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total cost</p>
                  <p className="mt-2 font-semibold text-slate-950">
                    {formatCurrency(assessment.recommendations.overall.supplier.totalCost)}
                  </p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Lead time</p>
                  <p className="mt-2 font-semibold text-slate-950">
                    {formatDays(assessment.recommendations.overall.supplier.leadTimeDays)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {recommendationEntries.map(({ key, entry }) => {
              const selected = selectedRecommendationKey === key;
              const isRoomOpen = selected && !!negotiationRoomHref;

              return (
                <div
                  key={key}
                  className={`flex flex-col rounded-[28px] border p-5 transition ${
                    selected
                      ? "border-white/28 bg-white/12 text-white"
                      : "border-white/10 bg-black/30 text-white hover:border-white/18 hover:bg-black/35"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                        {entry.label}
                      </p>

                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold ${
                            selected ? "bg-white/14 text-white" : "bg-white text-slate-950"
                          }`}
                        >
                          {supplierMonogram(entry.supplier.supplierName)}
                        </span>

                        <div>
                          <p className="text-lg font-semibold">{entry.supplier.supplierName}</p>
                          <p className="mt-1 text-sm text-white/58">
                            {entry.supplier.region} | {entry.supplier.country}
                          </p>
                        </div>
                      </div>
                    </div>

                    <span className="inline-flex rounded-full border border-white/12 bg-white/8 px-3 py-1 text-sm font-semibold text-white/80">
                      {entry.supplier.finalScore}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-white/72">{entry.reason}</p>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/60">
                    <span>{formatCurrency(entry.supplier.totalCost)}</span>
                    <span>{formatDays(entry.supplier.leadTimeDays)}</span>
                    <span>{entry.supplier.riskLevel} risk</span>
                  </div>

                  {isRoomOpen ? (
                    <Link
                      href={negotiationRoomHref}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-teal-300 transition hover:text-teal-200"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open negotiation room
                    </Link>
                  ) : null}

                  <div className="mt-auto flex gap-2 pt-5">
                    <button
                      type="button"
                      onClick={() => void handleOpenNegotiationRoom(key)}
                      disabled={recommendationPending}
                      className="flex-1 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {selected && recommendationPending ? "Opening..." : "Negotiate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleOpenNegotiationRoom(key)}
                      disabled={recommendationPending}
                      className="flex-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowAnalysis((current) => !current)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            {showAnalysis ? "Hide comparison details" : "Show comparison details"}
          </button>

          {showAnalysis ? (
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="rounded-[28px] border border-white/10 bg-white/92 p-5 text-slate-950 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <ShieldAlert className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-[family-name:var(--font-display)] text-xl">
                        Supplier Comparison
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Ranked shortlist generated during the conversation flow.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <SupplierComparisonTable
                      assessment={assessment}
                      formatCurrency={formatCurrency}
                    />
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/92 p-5 text-slate-950 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <SlidersHorizontal className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-[family-name:var(--font-display)] text-xl">
                        Decision Weights
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Reweight the shortlist without leaving the current workflow.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {weightLabels.map((entry) => (
                      <label key={entry.key} className="block space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">{entry.label}</span>
                          <span className="font-semibold text-slate-950">{weights[entry.key]}</span>
                        </div>

                        <input
                          type="range"
                          min={0}
                          max={40}
                          value={weights[entry.key]}
                          onChange={(event) =>
                            setWeights((current) => ({
                              ...current,
                              [entry.key]: Number(event.target.value),
                            }))
                          }
                          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-teal-500"
                        />
                      </label>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setWeights(defaultWeights)}
                    className="mt-5 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Reset balanced preset
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[28px] border border-white/10 bg-white/92 p-5 text-slate-950 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <ShieldAlert className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-[family-name:var(--font-display)] text-xl">
                        Risk Insights
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Disruption signals surfaced only after the shortlist was scored.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {assessment.riskInsights.map((insight) => (
                      <div
                        key={insight.key}
                        className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-900">{insight.label}</p>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${riskBadge(
                              insight.severity,
                            )}`}
                          >
                            {insight.severity}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {insight.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/92 p-5 text-slate-950 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <TriangleAlert className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-[family-name:var(--font-display)] text-xl">
                        Substitutes
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Alternatives appear only when the shortlist looks risky or late.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {assessment.substitutes.length ? (
                      assessment.substitutes.map((substitute) => (
                        <div
                          key={substitute.itemId}
                          className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"
                        >
                          <p className="font-semibold text-slate-900">{substitute.itemName}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {substitute.topSupplier} | {substitute.region} |{" "}
                            {formatDays(substitute.leadTimeDays)}
                          </p>
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {substitute.rationale}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                        No substitute escalation is needed for the current shortlist.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
