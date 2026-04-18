import { Suspense } from "react";
import { DashboardView } from "@/components/dashboard-view";
import { SiteShell } from "@/components/site-shell";

export default function Home() {
  return (
    <SiteShell
      eyebrow="Live Dashboard"
      title="ProcurePilot helps SME buyers source critical items faster during disruption."
      subtitle="Compare suppliers, surface risk, adjust decision weights, find substitutes, and generate a clean recommendation narrative in under a minute."
    >
      <Suspense fallback={<div className="h-40 rounded-[28px] bg-white/70" />}>
        <DashboardView />
      </Suspense>
    </SiteShell>
  );
}
