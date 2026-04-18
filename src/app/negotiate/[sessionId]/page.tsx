import { NegotiationRoomView } from "@/components/negotiation-room-view";
import { SiteShell } from "@/components/site-shell";

export const runtime = "nodejs";

export default async function NegotiationPage({
  params,
}: Readonly<{
  params: Promise<{ sessionId: string }>;
}>) {
  const { sessionId } = await params;

  return (
    <SiteShell
      eyebrow="Live Negotiation"
      title="ProcurePilot is negotiating as the buyer while you play the seller."
      subtitle="Use this room to counter, concede, or accept. The Lua buyer will keep the discussion moving until the terms are agreed."
    >
      <NegotiationRoomView sessionId={sessionId} />
    </SiteShell>
  );
}
