"use client";

import { AgentConsole } from "@/components/agent-console";
import { ProcurementRequest } from "@/lib/types";

export function DashboardView({
  requests: _requests,
  initialRequestId,
}: Readonly<{
  requests: ProcurementRequest[];
  initialRequestId?: string;
}>) {
  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-4 pb-12">
      <div className="mb-8 w-full max-w-3xl text-center">
        <h1 className="font-display text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
          Having trouble finding the best deal?
        </h1>
        <h3 className="mt-4 text-xl font-normal text-white/50">
          We&apos;ll sort it out for you.
        </h3>
      </div>
      <div className="w-full max-w-3xl">
        <AgentConsole initialRequestId={initialRequestId} />
      </div>
    </div>
  );
}
