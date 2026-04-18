"use client";

import { useMemo } from "react";
import { AgentConsole } from "@/components/agent-console";
import { defaultWeights } from "@/lib/data";
import { formatCompactCurrency, formatDays } from "@/lib/format";
import { scoreQuotesForRequest } from "@/lib/scoring";
import { ProcurementRequest } from "@/lib/types";

function Card({
  title,
  value,
  hint,
}: Readonly<{ title: string; value: string; hint: string }>) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-3 font-[family-name:var(--font-display)] text-3xl text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{hint}</p>
    </div>
  );
}

export function DashboardView({
  requests,
  initialRequestId,
}: Readonly<{
  requests: ProcurementRequest[];
  initialRequestId?: string;
}>) {
  const summary = useMemo(() => {
    const portfolio = requests.map((request) => {
      const top = scoreQuotesForRequest(request, defaultWeights)[0];
      return {
        top,
        request,
      };
    });

    const openRequests = requests.length;
    const riskyItems = portfolio.filter((entry) => entry.top?.riskLevel === "High").length;
    const averageLead =
      portfolio.reduce((sum, entry) => sum + (entry.top?.leadTimeDays ?? 0), 0) /
      Math.max(portfolio.filter((entry) => entry.top).length, 1);
    const totalValue = portfolio.reduce((sum, entry) => sum + (entry.top?.totalCost ?? 0), 0);

    return {
      openRequests,
      riskyItems,
      averageLead,
      totalValue,
    };
  }, [requests]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          title="Open requests"
          value={`${summary.openRequests}`}
          hint="Live procurement needs currently tracked in the app."
        />
        <Card
          title="High risk items"
          value={`${summary.riskyItems}`}
          hint="Requests where the top supplier still carries elevated disruption risk."
        />
        <Card
          title="Current portfolio value"
          value={formatCompactCurrency(summary.totalValue)}
          hint={`Average lead time across top picks is ${formatDays(
            Math.round(summary.averageLead || 0),
          )}.`}
        />
      </div>

      <AgentConsole initialRequestId={initialRequestId} />
    </div>
  );
}
