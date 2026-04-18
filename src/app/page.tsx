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
    <SiteShell>
      <DashboardView requests={requests} initialRequestId={resolvedSearchParams?.request} />
    </SiteShell>
  );
}
