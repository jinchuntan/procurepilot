"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ExternalLink,
  LoaderCircle,
  ShieldAlert,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import { LiquidMetalButton } from "@/components/liquid-metal-button";
import { useLocation } from "@/lib/location-context";
import { defaultWeights } from "@/lib/data";
import {
  formatDate,
  formatDays,
  formatPercent,
} from "@/lib/format";
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

const stepOptions: Partial<Record<Exclude<InterviewStep, "recommendations">, string[]>> = {
  quantity: ["1 unit", "10 units", "100 units"],
  requiredBy: ["Today", "In 7 days", "In 30 days"],
  budget: ["Under $5,000", "$5,000 to $20,000", "From $20,000"],
  priority: ["Low", "High", "Critical"],
  rating: ["70", "80", "90"],
  notes: ["skip", "Prioritise fastest delivery", "Eco-friendly suppliers preferred"],
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
                <div className={`mt-1 text-xs ${index === 0 ? "text-slate-300" : "text-slate-500"}`}>
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

export function AgentConsole({
  initialRequestId,
}: Readonly<{
  initialRequestId?: string;
}>) {
  const location = useLocation();
  const formatCurrency = useMemo(() => {
    const currency = location === "Malaysia" ? "MYR" : "SGD";
    const locale = location === "Malaysia" ? "ms-MY" : "en-SG";
    const fmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
    return (value: number) => fmt.format(value);
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
          text: "I’m building the supplier shortlist now and I’ll surface the strongest options in tiles below.",
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
            text: "The recommendation tiles are ready below. Pick one if you want me to open a live negotiation room where you can play the seller and I’ll negotiate as the buyer.",
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
    setTimeout(() => setSending(false), 350);

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
        room?: { session: { supplierName: string } };
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
          text: `The live seller room is ready. Open the link below, play the supplier, and I’ll negotiate there as the buyer until we close the deal.`,
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
        ? "Ask a follow-up question…"
        : "Type your answer here";

  const userHasReplied = messages.some((m) => m.role === "user");
  const chatActive = userHasReplied || assessmentPending;
  const currentStepOptions = step !== "recommendations" ? (stepOptions[step] ?? []) : [];
  const isUserTurn = !questionPending && !assessmentPending;
  const showOptions = isUserTurn && currentStepOptions.length > 0;
  const showStandaloneInput = !chatActive || (isUserTurn && currentStepOptions.length === 0);

  return (
    <section className="space-y-2">
      {/* Chat container — grows in from above the input when user first replies */}
      <div
        className={`overflow-hidden rounded-3xl bg-black/40 backdrop-blur-sm transition-all duration-700 ease-in-out ${
          chatActive
            ? "max-h-150 translate-y-0 opacity-100"
            : "max-h-0 -translate-y-2 opacity-0"
        }`}
      >
        {/* Compact scrollable history */}
        <div className="max-h-47.5 space-y-2.5 overflow-y-auto px-5 pb-3 pt-4 pr-4">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={message.role === "user" ? "flex justify-end" : ""}
            >
              <p
                className={
                  message.role === "assistant"
                    ? "max-w-[90%] text-sm leading-relaxed text-white/80"
                    : "max-w-[75%] rounded-2xl bg-white/15 px-3.5 py-2 text-sm text-white"
                }
              >
                {message.text}
              </p>
            </div>
          ))}

          {questionPending || assessmentPending ? (
            <div className="flex items-center gap-2 text-xs text-white/65">
              <LoaderCircle className="h-3 w-3 animate-spin" />
              {assessmentPending ? "Building your shortlist…" : "Thinking…"}
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        {/* Multiple-choice options (A / B / C rows + D custom) */}
        {showOptions ? (
          <div className="space-y-1.5 border-t border-white/8 px-4 pb-4 pt-3">
            {currentStepOptions.map((option, i) => (
              <button
                key={option}
                type="button"
                onClick={() => handleOptionClick(option)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/25 hover:bg-white/10 active:scale-[0.99]"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/20 text-xs font-semibold text-white/65">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-sm text-white/75">{option}</span>
              </button>
            ))}

            {/* D: custom free-text input */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 transition focus-within:border-white/25 focus-within:bg-white/8"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/20 text-xs font-semibold text-white/65">
                D
              </span>
              <input
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                disabled={questionPending || assessmentPending}
                placeholder="Type your own…"
                className="flex-1 bg-transparent py-1 text-sm text-white outline-none placeholder:text-white/25"
              />
              <LiquidMetalButton disabled={questionPending || assessmentPending} sending={sending} />
            </form>
          </div>
        ) : null}
      </div>

      {/* Standalone input — shown on first load or steps with no preset options */}
      {showStandaloneInput ? (
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 rounded-[22px] border border-white/10 bg-black/50 px-5 py-3 backdrop-blur-sm transition focus-within:border-white/20 focus-within:bg-black/60"
        >
          <input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            disabled={questionPending || assessmentPending}
            placeholder={chatActive ? inputPlaceholder : "What are we procuring today?"}
            className="flex-1 bg-transparent py-1 text-sm text-white outline-none placeholder:text-white/30"
          />
          <LiquidMetalButton
            disabled={questionPending || assessmentPending}
            sending={sending}
          />
        </form>
      ) : null}

      {error ? (
        <div className="rounded-[18px] border border-rose-300/40 bg-rose-500/20 px-4 py-3 text-sm text-rose-200 backdrop-blur-sm">
          {error}
        </div>
      ) : null}

      {assessment ? (
        <div className="space-y-3">
          {/* 2×2 recommendation tiles */}
          <div className="grid gap-3 sm:grid-cols-2">
            {recommendationEntries.map(({ key, entry }) => {
              const selected = selectedRecommendationKey === key;
              const isRoomOpen = selected && !!negotiationRoomHref;

              return (
                <div
                  key={key}
                  className={`flex flex-col rounded-2xl border p-4 backdrop-blur-sm transition ${
                    selected
                      ? "border-white/35 bg-white/12"
                      : "border-white/12 bg-black/35 hover:border-white/20"
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
                        {entry.label}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white">
                          {supplierMonogram(entry.supplier.supplierName)}
                        </span>
                        <p className="text-sm font-semibold text-white">
                          {entry.supplier.supplierName}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/15 bg-white/8 px-2.5 py-0.5 text-xs font-semibold text-white/70">
                      {entry.supplier.finalScore}
                    </span>
                  </div>

                  {/* Key stats */}
                  <div className="mt-3 flex items-center gap-3 text-xs text-white/55">
                    <span className="font-medium text-white/80">
                      {formatCurrency(entry.supplier.totalCost)}
                    </span>
                    <span className="text-white/25">·</span>
                    <span>{formatDays(entry.supplier.leadTimeDays)}</span>
                    <span className="text-white/25">·</span>
                    <span
                      className={
                        entry.supplier.riskLevel === "High"
                          ? "text-rose-400"
                          : entry.supplier.riskLevel === "Medium"
                            ? "text-amber-400"
                            : "text-emerald-400"
                      }
                    >
                      {entry.supplier.riskLevel} risk
                    </span>
                  </div>

                  {/* Negotiation room link (once opened) */}
                  {isRoomOpen ? (
                    <Link
                      href={negotiationRoomHref!}
                      className="mt-3 flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open negotiation room
                    </Link>
                  ) : null}

                  {/* Action buttons */}
                  <div className="mt-auto flex gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => void handleOpenNegotiationRoom(key)}
                      disabled={recommendationPending}
                      className="flex-1 rounded-lg border border-white/15 bg-white/6 py-2 text-xs font-medium text-white/70 transition hover:bg-white/12 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {selected && recommendationPending ? "Opening…" : "Negotiate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleOpenNegotiationRoom(key)}
                      disabled={recommendationPending}
                      className="flex-1 rounded-lg bg-white/90 py-2 text-xs font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Advanced Analysis toggle */}
          <button
            type="button"
            onClick={() => setShowAnalysis((c) => !c)}
            className="flex w-full items-center justify-center gap-1.5 py-1 text-xs text-white transition hover:text-white/70"
          >
            <span>{showAnalysis ? "Hide" : "Advanced Analysis"}</span>
            <span className={`transition-transform duration-200 ${showAnalysis ? "rotate-180" : ""}`}>
              ▾
            </span>
            {assessment.warnings.length > 0 && !showAnalysis ? (
              <span className="ml-1 rounded-full bg-amber-500/30 px-1.5 py-0.5 text-[10px] text-amber-300">
                {assessment.warnings.length} risk
              </span>
            ) : null}
          </button>

          {/* Advanced Analysis panel */}
          {showAnalysis ? (
            <div className="space-y-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              {/* Supplier comparison table */}
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/70">
                  Supplier Comparison
                </p>
                <SupplierComparisonTable assessment={assessment} formatCurrency={formatCurrency} />
              </div>

              {/* Decision weights */}
              <div className="border-t border-white/8 pt-3">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/70">
                  Decision Weights
                </p>
                <div className="space-y-2.5">
                  {weightLabels.map((entry) => (
                    <label key={entry.key} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-xs text-white/55">{entry.label}</span>
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
                        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-teal-400"
                      />
                      <span className="w-6 text-right text-xs font-semibold text-white/60">
                        {weights[entry.key]}
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setWeights(defaultWeights)}
                  className="mt-2 text-xs text-white/50 hover:text-white transition"
                >
                  Reset defaults
                </button>
              </div>

              {/* Risk insights */}
              {assessment.riskInsights.length > 0 ? (
                <div className="border-t border-white/8 pt-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/70">
                    Risk Insights
                  </p>
                  <div className="space-y-2">
                    {assessment.riskInsights.map((insight) => (
                      <div key={insight.key} className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-white">{insight.label}</p>
                          <p className="mt-0.5 text-xs text-white/70">{insight.description}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${riskBadge(insight.severity)}`}
                        >
                          {insight.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Substitutes */}
              {assessment.substitutes.length > 0 ? (
                <div className="border-t border-white/8 pt-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/70">
                    Substitutes
                  </p>
                  <div className="space-y-2">
                    {assessment.substitutes.map((sub) => (
                      <div key={sub.itemId} className="text-xs">
                        <p className="font-medium text-white/75">{sub.itemName}</p>
                        <p className="text-white/65">
                          {sub.topSupplier} · {sub.region} · {formatDays(sub.leadTimeDays)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
