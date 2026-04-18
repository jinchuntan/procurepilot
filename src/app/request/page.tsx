import { RequestForm } from "@/components/request-form";
import { SiteShell } from "@/components/site-shell";

export default function RequestPage() {
  return (
    <SiteShell
      eyebrow="New Request"
      title="Capture one procurement need and let the Lua agent take over from there."
      subtitle="The interface stays simple on purpose: one request form in, one clear recommendation workflow out."
    >
      <RequestForm />
    </SiteShell>
  );
}
