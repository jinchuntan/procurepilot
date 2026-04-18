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
    <div className="rounded-[28px] border border-white/10 bg-black/26 p-5 shadow-[0_18px_40px_rgba(2,6,23,0.26)] backdrop-blur">
      <p className="text-sm text-white/55">{title}</p>
      <p className="mt-3 font-[family-name:var(--font-display)] text-3xl text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-white/65">{hint}</p>
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
        request,
        top,
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
    <div className="space-y-8 pb-10">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-sm font-medium uppercase tracking-[0.32em] text-teal-200/80">
          Frontend Mode
        </p>
        <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl tracking-tight text-white sm:text-5xl lg:text-6xl">
          Having trouble finding the best deal?
        </h1>
        <p className="mt-4 text-lg text-white/60">We&apos;ll sort it out for you.</p>
      </div>

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

      <div className="mx-auto w-full max-w-5xl">
        <AgentConsole initialRequestId={initialRequestId} />
      </div>
    </div>
  );
}
