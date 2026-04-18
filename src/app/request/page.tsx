import { RequestForm } from "@/components/request-form";
import { SiteShell } from "@/components/site-shell";

export default function RequestPage() {
  return (
    <SiteShell
      eyebrow="New Request"
      title="Capture an urgent procurement need and let ProcurePilot build the sourcing shortlist."
      subtitle="This form is designed for demo speed: preload realistic examples, tweak business constraints, and jump straight into ranked supplier recommendations."
    >
      <RequestForm />
    </SiteShell>
  );
}
