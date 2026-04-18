"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, ClipboardCheck, FlaskConical, Sparkles } from "lucide-react";
import { catalogItems, sampleRequestTemplates } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { saveRequests, loadRequests } from "@/lib/storage";
import { Priority } from "@/lib/types";

const priorityOptions: Priority[] = ["Low", "Medium", "High", "Critical"];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function futureDate(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

export function RequestForm() {
  const router = useRouter();
  const [selectedItemId, setSelectedItemId] = useState(sampleRequestTemplates[0]?.itemId ?? catalogItems[0]?.id ?? "");
  const [quantity, setQuantity] = useState(sampleRequestTemplates[0]?.quantity ?? 1);
  const [requiredBy, setRequiredBy] = useState(futureDate(sampleRequestTemplates[0]?.requiredInDays ?? 7));
  const [budgetMin, setBudgetMin] = useState(sampleRequestTemplates[0]?.budgetMin ?? 1000);
  const [budgetMax, setBudgetMax] = useState(sampleRequestTemplates[0]?.budgetMax ?? 2000);
  const [priority, setPriority] = useState<Priority>(sampleRequestTemplates[0]?.priority ?? "High");
  const [minSupplierRating, setMinSupplierRating] = useState(
    sampleRequestTemplates[0]?.minSupplierRating ?? 80,
  );
  const [notes, setNotes] = useState(sampleRequestTemplates[0]?.notes ?? "");

  const selectedItem = useMemo(
    () => catalogItems.find((item) => item.id === selectedItemId) ?? catalogItems[0],
    [selectedItemId],
  );

  const budgetSpan = Math.max(budgetMax - budgetMin, 0);

  function applyTemplate(templateId: string) {
    const template = sampleRequestTemplates.find((entry) => entry.id === templateId);
    const item = catalogItems.find((entry) => entry.id === template?.itemId);

    if (!template || !item) {
      return;
    }

    setSelectedItemId(item.id);
    setQuantity(template.quantity);
    setRequiredBy(futureDate(template.requiredInDays));
    setBudgetMin(template.budgetMin);
    setBudgetMax(template.budgetMax);
    setPriority(template.priority);
    setMinSupplierRating(template.minSupplierRating);
    setNotes(template.notes);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedItem) {
      return;
    }

    const requests = loadRequests();
    const requestId = `req-${Date.now()}`;
    const nextRequests = [
      {
        id: requestId,
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        category: selectedItem.category,
        quantity,
        requiredBy,
        budgetMin,
        budgetMax,
        priority,
        minSupplierRating,
        notes,
        createdAt: todayDate(),
      },
      ...requests,
    ];

    saveRequests(nextRequests);
    startTransition(() => {
      router.push(`/?request=${requestId}`);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <form
        onSubmit={handleSubmit}
        className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8"
      >
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-500">New Procurement Request</p>
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-slate-950">
                Capture the sourcing brief in one pass
              </h2>
            </div>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            ProcurePilot uses this request to shortlist suppliers, score urgency fit, surface substitutes,
            and explain the recommendation in business language.
          </p>
          <div className="flex flex-wrap gap-2">
            {sampleRequestTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template.id)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {template.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Item name</span>
            <select
              value={selectedItemId}
              onChange={(event) => setSelectedItemId(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:bg-white"
            >
              {catalogItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Category</span>
            <input
              value={selectedItem?.category ?? ""}
              readOnly
              className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm capitalize text-slate-700"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Quantity</span>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Required by date</span>
            <input
              type="date"
              min={todayDate()}
              value={requiredBy}
              onChange={(event) => setRequiredBy(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Budget min</span>
            <input
              type="number"
              min={0}
              value={budgetMin}
              onChange={(event) => setBudgetMin(Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Budget max</span>
            <input
              type="number"
              min={budgetMin}
              value={budgetMax}
              onChange={(event) => setBudgetMax(Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Priority / urgency</span>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as Priority)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:bg-white"
            >
              {priorityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Minimum supplier rating</span>
            <input
              type="number"
              min={60}
              max={99}
              value={minSupplierRating}
              onChange={(event) => setMinSupplierRating(Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:bg-white"
            />
          </label>
        </div>

        <label className="mt-5 block space-y-2">
          <span className="text-sm font-semibold text-slate-700">Notes or technical specs</span>
          <textarea
            rows={5}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-400 focus:bg-white"
          />
        </label>

        <div className="mt-6 flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">
              Budget window: {formatCurrency(budgetMin)} to {formatCurrency(budgetMax)}
            </p>
            <p className="text-sm text-slate-600">
              Flexibility band of {formatCurrency(budgetSpan)} gives the engine room to trade cost against
              speed and risk.
            </p>
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Run supplier comparison
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>

      <div className="space-y-6">
        <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <FlaskConical className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-500">Selected SKU</p>
              <h3 className="font-[family-name:var(--font-display)] text-xl text-slate-950">
                {selectedItem?.name}
              </h3>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">{selectedItem?.description}</p>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">Specs</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{selectedItem?.technicalSpecs}</p>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-500">What ProcurePilot will generate</p>
              <h3 className="font-[family-name:var(--font-display)] text-xl text-slate-950">
                Instant sourcing output
              </h3>
            </div>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              Supplier comparison table across price, lead time, stock, risk, MOQ, and delivery confidence
            </li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              Ranked recommendations for best overall, fastest, low-cost, and balanced sourcing choices
            </li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              Substitute options and crisis insights if the shortlist looks risky or slow
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
