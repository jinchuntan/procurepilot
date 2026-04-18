import { DashboardView } from "@/components/dashboard-view";
import { SiteShell } from "@/components/site-shell";
import { listRequests } from "@/lib/server/request-repository";

export const runtime = "nodejs";

export default async function Home({
  searchParams,
}: Readonly<{
  searchParams?: Promise<{ request?: string }>;
}>) {
  const requests = listRequests();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <SiteShell
      eyebrow="Live Dashboard"
      title="ProcurePilot keeps procurement simple while the Lua agent does the heavy lifting."
      subtitle="Start with one plain-English procurement request. The live Lua agent will ask follow-up questions, build the shortlist, and open a live negotiation room when you are ready."
    >
      <DashboardView requests={requests} initialRequestId={resolvedSearchParams?.request} />
    </SiteShell>
  );
}
