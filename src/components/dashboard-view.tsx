"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowRight,
  Clock3,
  Copy,
  FileText,
  Layers3,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
  WalletCards,
} from "lucide-react";
import { defaultWeights, getItemById } from "@/lib/data";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatDays,
  formatDelta,
  formatPercent,
} from "@/lib/format";
import {
  buildUrgencyComparison,
  getRecommendationBundle,
  getRiskInsights,
  getSubstituteSuggestions,
  scoreQuotesForRequest,
} from "@/lib/scoring";
import { loadRequests, loadWeights, saveWeights } from "@/lib/storage";
import { ProcurementRequest, RiskLevel, Weights } from "@/lib/types";

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

function priorityBadge(priority: ProcurementRequest["priority"]) {
  if (priority === "Critical") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (priority === "High") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (priority === "Medium") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function SectionCard({
  title,
  description,
  icon,
  children,
}: Readonly<{
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}>) {
  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </span>
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: Readonly<{ label: string; value: string; hint: string }>) {
  return (
    <div className="rounded-[24px] border border-white/12 bg-slate-950/78 p-5 text-white shadow-[0_20px_50px_rgba(15,23,42,0.28)] backdrop-blur">
      <p className="text-sm text-slate-300">{label}</p>
      <p className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{hint}</p>
    </div>
  );
}

function ScoreBar({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>{label}</span>
        <span className="font-semibold text-slate-900">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-teal-400 via-sky-500 to-cyan-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function DashboardView() {
  const searchParams = useSearchParams();
  const requestFromQuery = searchParams.get("request");
  const [requests] = useState<ProcurementRequest[]>(() => loadRequests());
  const [weights, setWeights] = useState<Weights>(() => loadWeights());
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    saveWeights(weights);
  }, [weights]);

  const activeRequestId = selectedRequestId || requestFromQuery || requests[0]?.id || "";

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === activeRequestId) ?? requests[0],
    [activeRequestId, requests],
  );

  const portfolio = useMemo(() => {
    return requests.map((request) => {
      const scored = scoreQuotesForRequest(request, defaultWeights);
      const top = scored[0];
      const unitPrices = scored.map((quote) => quote.unitPrice).sort((left, right) => left - right);
      const median = unitPrices[Math.floor(unitPrices.length / 2)] ?? 0;
      const savings = top ? Math.max(0, (median - top.unitPrice) * request.quantity) : 0;

      return {
        request,
        scored,
        top,
        savings,
      };
    });
  }, [requests]);

  const selectedQuotes = useMemo(
    () => (selectedRequest ? scoreQuotesForRequest(selectedRequest, weights) : []),
    [selectedRequest, weights],
  );

  const selectedItem = selectedRequest ? getItemById(selectedRequest.itemId) : undefined;
  const recommendations =
    selectedRequest && selectedQuotes.length
      ? getRecommendationBundle(selectedRequest, selectedQuotes)
      : null;
  const riskInsights =
    selectedRequest && selectedQuotes.length ? getRiskInsights(selectedRequest, selectedQuotes) : [];
  const substitutes =
    selectedRequest && selectedQuotes.length
      ? getSubstituteSuggestions(selectedRequest, weights, selectedQuotes)
      : [];
  const urgencyComparison =
    selectedRequest && selectedQuotes.length
      ? buildUrgencyComparison(selectedRequest, weights, selectedQuotes)
      : null;

  const summary = useMemo(() => {
    const openRequests = requests.length;
    const riskyItems = portfolio.filter(
      (entry) =>
        entry.top?.riskLevel === "High" ||
        entry.scored.filter((quote) => quote.riskLevel === "High").length >= 2,
    ).length;
    const averageLead =
      portfolio.reduce((sum, entry) => sum + (entry.top?.leadTimeDays ?? 0), 0) /
      Math.max(portfolio.filter((entry) => entry.top).length, 1);
    const savings = portfolio.reduce((sum, entry) => sum + entry.savings, 0);

    return {
      openRequests,
      riskyItems,
      averageLead,
      savings,
    };
  }, [portfolio, requests.length]);

  const recentRecommendations = useMemo(() => {
    return [...portfolio]
      .sort(
        (left, right) =>
          new Date(right.request.createdAt).getTime() - new Date(left.request.createdAt).getTime(),
      )
      .slice(0, 4);
  }, [portfolio]);

  const rfqDraft = useMemo(() => {
    if (!selectedRequest || !recommendations || !selectedItem) {
      return "";
    }

    return [
      `RFQ DRAFT`,
      ``,
      `Item: ${selectedItem.name}`,
      `Quantity: ${selectedRequest.quantity} x ${selectedItem.unit}`,
      `Required by: ${formatDate(selectedRequest.requiredBy)}`,
      `Preferred supplier: ${recommendations.overall.supplier.supplierName}`,
      `Budget range: ${formatCurrency(selectedRequest.budgetMin)} - ${formatCurrency(selectedRequest.budgetMax)}`,
      `Business notes: ${selectedRequest.notes}`,
      ``,
      `Please confirm availability, final unit price, delivery commitment, and any substitute options for this urgent requirement.`,
    ].join("\n");
  }, [recommendations, selectedItem, selectedRequest]);

  function exportRecommendation() {
    if (!selectedRequest || !recommendations) {
      return;
    }

    const content = [
      `ProcurePilot recommendation summary`,
      ``,
      `Request: ${selectedRequest.itemName}`,
      `Priority: ${selectedRequest.priority}`,
      `Required by: ${formatDate(selectedRequest.requiredBy)}`,
      `Budget: ${formatCurrency(selectedRequest.budgetMin)} - ${formatCurrency(selectedRequest.budgetMax)}`,
      ``,
      `${recommendations.overall.label}: ${recommendations.overall.supplier.supplierName}`,
      `${recommendations.overall.reason}`,
      ``,
      `Top supplier score: ${recommendations.overall.supplier.finalScore}`,
      `Unit price: ${formatCurrency(recommendations.overall.supplier.unitPrice)}`,
      `Lead time: ${formatDays(recommendations.overall.supplier.leadTimeDays)}`,
      `Risk level: ${recommendations.overall.supplier.riskLevel}`,
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `procurepilot-${selectedRequest.itemId}-summary.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyRfqDraft() {
    if (!rfqDraft) {
      return;
    }

    await navigator.clipboard.writeText(rfqDraft);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (!selectedRequest || !recommendations) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Open procurement requests"
          value={`${summary.openRequests}`}
          hint="Current live sourcing briefs across the SME procurement desk."
        />
        <MetricCard
          label="High-risk items"
          value={`${summary.riskyItems}`}
          hint="Requests where supplier risk or concentration needs a mitigation plan."
        />
        <MetricCard
          label="Average lead time"
          value={formatDays(Math.round(summary.averageLead || 0))}
          hint="Average ETA of the top-ranked supplier across the active portfolio."
        />
        <MetricCard
          label="Potential savings"
          value={formatCompactCurrency(summary.savings)}
          hint="Estimated savings against the median supplier option across open requests."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.55fr_1fr]">
        <div className="space-y-6">
          <SectionCard
            title="Open Requests"
            description="Select any active sourcing brief to refresh the shortlist and recommendation logic."
            icon={<Layers3 className="h-5 w-5" />}
          >
            <div className="space-y-3">
              {requests.map((request) => {
                const active = request.id === selectedRequest.id;
                const topSupplier = portfolio.find((entry) => entry.request.id === request.id)?.top;

                return (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setSelectedRequestId(request.id)}
                    className={`w-full rounded-[24px] border p-4 text-left transition ${
                      active
                        ? "border-slate-950 bg-slate-950 text-white shadow-[0_20px_40px_rgba(15,23,42,0.22)]"
                        : "border-slate-200 bg-slate-50 hover:border-teal-200 hover:bg-teal-50"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold">{request.itemName}</p>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityBadge(
                          request.priority,
                        )}`}
                      >
                        {request.priority}
                      </span>
                    </div>
                    <div className={`mt-3 flex flex-wrap gap-3 text-xs ${active ? "text-slate-200" : "text-slate-500"}`}>
                      <span>{request.quantity} units</span>
                      <span>Due {formatDate(request.requiredBy)}</span>
                      <span>{request.category}</span>
                    </div>
                    <p className={`mt-3 text-sm ${active ? "text-slate-200" : "text-slate-600"}`}>
                      {topSupplier
                        ? `Top pick: ${topSupplier.supplierName} | ${formatCurrency(topSupplier.unitPrice)} | ${formatDays(topSupplier.leadTimeDays)}`
                        : "No shortlist available"}
                    </p>
                  </button>
                );
              })}
            </div>
          </SectionCard>
          <SectionCard
            title="Supplier Comparison Engine"
            description="Transparent shortlist across cost, speed, resilience, and supply confidence."
            icon={<WalletCards className="h-5 w-5" />}
          >
            <div className="space-y-3 lg:hidden">
              {selectedQuotes.map((quote, index) => (
                <article
                  key={`${quote.supplierId}-mobile`}
                  className={`rounded-[24px] border p-4 ${
                    index === 0
                      ? "border-slate-950 bg-slate-950 text-white shadow-[0_20px_40px_rgba(15,23,42,0.22)]"
                      : "border-slate-200 bg-slate-50 text-slate-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{quote.supplierName}</p>
                      <p className={`mt-1 text-xs ${index === 0 ? "text-slate-300" : "text-slate-500"}`}>
                        {quote.region}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        index === 0 ? "border-white/15 bg-white/8 text-white" : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      Score {quote.finalScore}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className={`rounded-2xl p-3 ${index === 0 ? "bg-white/6" : "bg-white"}`}>
                      <p className={`text-xs uppercase tracking-[0.18em] ${index === 0 ? "text-slate-300" : "text-slate-500"}`}>
                        Unit price
                      </p>
                      <p className="mt-1 font-semibold">{formatCurrency(quote.unitPrice)}</p>
                    </div>
                    <div className={`rounded-2xl p-3 ${index === 0 ? "bg-white/6" : "bg-white"}`}>
                      <p className={`text-xs uppercase tracking-[0.18em] ${index === 0 ? "text-slate-300" : "text-slate-500"}`}>
                        Lead time
                      </p>
                      <p className="mt-1 font-semibold">{formatDays(quote.leadTimeDays)}</p>
                    </div>
                    <div className={`rounded-2xl p-3 ${index === 0 ? "bg-white/6" : "bg-white"}`}>
                      <p className={`text-xs uppercase tracking-[0.18em] ${index === 0 ? "text-slate-300" : "text-slate-500"}`}>
                        Reliability
                      </p>
                      <p className="mt-1 font-semibold">{formatPercent(quote.reliability)}</p>
                    </div>
                    <div className={`rounded-2xl p-3 ${index === 0 ? "bg-white/6" : "bg-white"}`}>
                      <p className={`text-xs uppercase tracking-[0.18em] ${index === 0 ? "text-slate-300" : "text-slate-500"}`}>
                        Stock / MOQ
                      </p>
                      <p className="mt-1 font-semibold">
                        {formatPercent(quote.stockAvailability)} / MOQ {quote.moq}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${riskBadge(quote.riskLevel)}`}>
                      {quote.riskLevel} risk
                    </span>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        index === 0 ? "border-white/15 bg-white/8 text-white" : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      Delivery {formatPercent(quote.deliveryConfidence)}
                    </span>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        index === 0 ? "border-white/15 bg-white/8 text-white" : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {quote.complianceTag}
                    </span>
                  </div>

                  {quote.flags.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {quote.flags.map((flag) => (
                        <span
                          key={flag}
                          className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                            index === 0
                              ? "border-white/15 bg-white/8 text-white"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full border-separate border-spacing-y-3 text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-4">Supplier</th>
                    <th className="px-4">Score</th>
                    <th className="px-4">Unit price</th>
                    <th className="px-4">Lead</th>
                    <th className="px-4">Reliability</th>
                    <th className="px-4">Stock</th>
                    <th className="px-4">Risk</th>
                    <th className="px-4">MOQ</th>
                    <th className="px-4">Delivery conf.</th>
                    <th className="px-4">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedQuotes.map((quote, index) => (
                    <tr
                      key={quote.supplierId}
                      className={`rounded-[24px] ${
                        index === 0 ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
                      }`}
                    >
                      <td className="rounded-l-[24px] px-4 py-4">
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
                                    : "border-slate-200 bg-white text-slate-600"
                                }`}
                              >
                                {flag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 font-semibold">{quote.finalScore}</td>
                      <td className="px-4 py-4">{formatCurrency(quote.unitPrice)}</td>
                      <td className="px-4 py-4">{formatDays(quote.leadTimeDays)}</td>
                      <td className="px-4 py-4">{formatPercent(quote.reliability)}</td>
                      <td className="px-4 py-4">{formatPercent(quote.stockAvailability)}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${riskBadge(
                            quote.riskLevel,
                          )}`}
                        >
                          {quote.riskLevel}
                        </span>
                      </td>
                      <td className="px-4 py-4">{quote.moq}</td>
                      <td className="px-4 py-4">{formatPercent(quote.deliveryConfidence)}</td>
                      <td className="rounded-r-[24px] px-4 py-4">
                        <div className="space-y-1 text-xs">
                          <div>{quote.complianceTag}</div>
                          <div className={index === 0 ? "text-slate-300" : "text-slate-500"}>
                            {quote.sustainabilityTag}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
          <SectionCard
            title="Recent Supplier Recommendations"
            description="Fast snapshot for judges and operators to see recent procurement outcomes."
            icon={<Sparkles className="h-5 w-5" />}
          >
            <div className="space-y-3">
              {recentRecommendations.map((entry) => (
                <div
                  key={entry.request.id}
                  className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{entry.request.itemName}</p>
                    <span className="text-xs font-semibold text-slate-500">
                      {entry.top ? `${entry.top.finalScore} / 100` : "Pending"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {entry.top
                      ? `${entry.top.supplierName} recommended with ${entry.top.riskLevel.toLowerCase()} risk and ${formatDays(entry.top.leadTimeDays)} lead time.`
                      : "Awaiting supplier data."}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title={selectedRequest.itemName}
            description="Current sourcing brief, business constraints, and the live AI recommendation output."
            icon={<ArrowRight className="h-5 w-5" />}
          >
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityBadge(
                      selectedRequest.priority,
                    )}`}
                  >
                    {selectedRequest.priority}
                  </span>
                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                    Min rating {selectedRequest.minSupplierRating}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Quantity</p>
                    <p className="mt-1 font-medium text-slate-900">
                      {selectedRequest.quantity} x {selectedItem?.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Required by</p>
                    <p className="mt-1 font-medium text-slate-900">{formatDate(selectedRequest.requiredBy)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Budget range</p>
                    <p className="mt-1 font-medium text-slate-900">
                      {formatCurrency(selectedRequest.budgetMin)} - {formatCurrency(selectedRequest.budgetMax)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Category</p>
                    <p className="mt-1 font-medium capitalize text-slate-900">{selectedRequest.category}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-[20px] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Notes</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{selectedRequest.notes}</p>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-950 p-4 text-white">
                <p className="text-sm text-slate-300">Best overall supplier</p>
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl">
                  {recommendations.overall.supplier.supplierName}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-200">{recommendations.overall.reason}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white/6 p-3">
                    <p className="text-slate-300">Unit price</p>
                    <p className="mt-1 font-semibold text-white">
                      {formatCurrency(recommendations.overall.supplier.unitPrice)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/6 p-3">
                    <p className="text-slate-300">Lead time</p>
                    <p className="mt-1 font-semibold text-white">
                      {formatDays(recommendations.overall.supplier.leadTimeDays)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {Object.values(recommendations).map((entry) => (
                <div
                  key={entry.label}
                  className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {entry.label}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-950">
                        {entry.supplier.supplierName}
                      </h3>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
                      {entry.supplier.finalScore}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{entry.reason}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Decision Transparency"
            description="Adjust the weighted logic and watch suppliers re-rank instantly."
            icon={<SlidersHorizontal className="h-5 w-5" />}
          >
            <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
              <div className="space-y-4">
                {weightLabels.map((entry) => (
                  <label key={entry.key} className="block space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{entry.label}</span>
                      <span className="font-semibold text-slate-900">{weights[entry.key]}</span>
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
                <button
                  type="button"
                  onClick={() => setWeights(defaultWeights)}
                  className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Reset to balanced preset
                </button>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Current leader: {selectedQuotes[0]?.supplierName}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Normalized scores make the ranking easy to explain to buyers and judges.
                </p>
                <div className="mt-5 space-y-4">
                  <ScoreBar label="Price advantage" value={selectedQuotes[0]?.scoreBreakdown.price ?? 0} />
                  <ScoreBar label="Lead-time advantage" value={selectedQuotes[0]?.scoreBreakdown.leadTime ?? 0} />
                  <ScoreBar label="Reliability" value={selectedQuotes[0]?.scoreBreakdown.reliability ?? 0} />
                  <ScoreBar label="Stock availability" value={selectedQuotes[0]?.scoreBreakdown.stockAvailability ?? 0} />
                  <ScoreBar label="Risk resilience" value={selectedQuotes[0]?.scoreBreakdown.supplierRisk ?? 0} />
                  <ScoreBar label="Urgency fit" value={selectedQuotes[0]?.scoreBreakdown.urgencyFit ?? 0} />
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Crisis / Risk Insights"
            description="Simple risk signals to help buyers move early during disruption."
            icon={<ShieldAlert className="h-5 w-5" />}
          >
            <div className="space-y-3">
              {riskInsights.map((insight) => (
                <div key={insight.key} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{insight.label}</p>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${riskBadge(
                        insight.severity,
                      )}`}
                    >
                      {insight.severity} risk
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{insight.description}</p>
                </div>
              ))}
              {selectedItem?.crisisProfile.notes.map((note) => (
                <div
                  key={note}
                  className="rounded-[22px] border border-dashed border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600"
                >
                  {note}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Substitute Finder"
            description="Alternative items and regions when the exact spec looks slow, risky, or thin on stock."
            icon={<TriangleAlert className="h-5 w-5" />}
          >
            <div className="space-y-3">
              {substitutes.length > 0 ? (
                substitutes.map((substitute) => (
                  <div key={substitute.itemId} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{substitute.itemName}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          Best supplier: {substitute.topSupplier} | {substitute.region}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${riskBadge(
                          substitute.riskLevel,
                        )}`}
                      >
                        {substitute.riskLevel}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                      <span>{formatDays(substitute.leadTimeDays)}</span>
                      <span>{formatDelta(substitute.priceDelta)}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{substitute.rationale}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                  The current shortlist looks healthy enough that ProcurePilot is not forcing a substitute right
                  now. If urgency or risk increases, alternatives will appear here automatically.
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="What Changed"
            description="Shows what happens if the urgency lens becomes stricter."
            icon={<Clock3 className="h-5 w-5" />}
          >
            <div
              className={`rounded-[22px] border p-4 text-sm leading-6 ${
                urgencyComparison?.changed
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-emerald-200 bg-emerald-50 text-emerald-900"
              }`}
            >
              {urgencyComparison?.message}
            </div>
          </SectionCard>

          <SectionCard
            title="RFQ Draft / Export"
            description="Small hackathon-ready feature to move from recommendation to action."
            icon={<FileText className="h-5 w-5" />}
          >
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <pre className="overflow-x-auto whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {rfqDraft}
              </pre>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copyRfqDraft}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied" : "Copy RFQ draft"}
              </button>
              <button
                type="button"
                onClick={exportRecommendation}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <ArrowDownToLine className="h-4 w-4" />
                Export recommendation
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
