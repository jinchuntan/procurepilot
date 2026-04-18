"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle, Send, ShieldCheck } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { NegotiationRoom } from "@/lib/types";

export function NegotiationRoomView({
  sessionId,
}: Readonly<{
  sessionId: string;
}>) {
  const [room, setRoom] = useState<NegotiationRoom | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRoom() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/agent/negotiation/session/${sessionId}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as { room?: NegotiationRoom; error?: string };

        if (!response.ok || !data.room) {
          throw new Error(data.error ?? "Failed to load negotiation room.");
        }

        setRoom(data.room);
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load negotiation room.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadRoom();

    return () => controller.abort();
  }, [sessionId]);

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!message.trim()) {
      return;
    }

    try {
      setSending(true);
      setError(null);

      const response = await fetch(`/api/agent/negotiation/session/${sessionId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
        }),
      });
      const data = (await response.json()) as { room?: NegotiationRoom; error?: string };

      if (!response.ok || !data.room) {
        throw new Error(data.error ?? "Failed to send negotiation reply.");
      }

      setRoom(data.room);
      setMessage("");
    } catch (replyError) {
      setError(replyError instanceof Error ? replyError.message : "Failed to send negotiation reply.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <div className="inline-flex items-center gap-2">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading negotiation room...
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {error ?? "Negotiation room not found."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sourcing flow
        </Link>
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${
            room.session.status === "closed"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          {room.session.status === "closed" ? "Deal closed" : "Negotiation open"}
        </span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-semibold text-slate-500">Negotiation brief</p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-slate-950">
            {room.session.supplierName}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            You are the seller on this page. ProcurePilot is acting as the buyer and will keep
            pushing for better commercial terms until a deal is accepted.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Item</p>
              <p className="mt-2 font-semibold text-slate-950">{room.request.itemName}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Required by</p>
              <p className="mt-2 font-semibold text-slate-950">{formatDate(room.request.requiredBy)}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Opening quote</p>
              <p className="mt-2 font-semibold text-slate-950">
                {formatCurrency(room.session.openedTotal)}
              </p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Buyer target</p>
              <p className="mt-2 font-semibold text-slate-950">
                {formatCurrency(room.session.targetTotal)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-950 p-5 text-white">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Why this supplier</p>
            <p className="mt-2 text-lg font-semibold">{room.recommendation.label}</p>
            <p className="mt-3 text-sm leading-6 text-slate-200">{room.recommendation.reason}</p>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-500">Buyer vs seller room</p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-slate-950">
                Live negotiation
              </h2>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Lua buyer active
            </span>
          </div>

          <div className="mt-5 max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {room.messages.map((entry) => (
              <div
                key={entry.id}
                className={`max-w-3xl rounded-[22px] px-4 py-3 text-sm leading-6 ${
                  entry.role === "buyer"
                    ? "ml-auto bg-slate-950 text-white"
                    : "border border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                  {entry.speaker}
                </p>
                <p className="mt-2">{entry.text}</p>
              </div>
            ))}

            {error ? (
              <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSend} className="mt-5 space-y-3">
            <textarea
              rows={4}
              value={message}
              disabled={sending || room.session.status === "closed"}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={
                room.session.status === "closed"
                  ? "This negotiation is already closed."
                  : "Reply as the seller. Example: We can reduce the total to USD 5,480 if you confirm today."
              }
              className="w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-400 focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                Type your seller counteroffer or acceptance. ProcurePilot will answer as the buyer.
              </p>
              <button
                type="submit"
                disabled={sending || room.session.status === "closed"}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {sending ? "Sending..." : "Send as seller"}
                {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
