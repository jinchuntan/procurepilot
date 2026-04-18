"use client";

import { startTransition, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ClipboardCheck, Sparkles } from "lucide-react";
import { catalogItems, sampleRequestTemplates } from "@/lib/data";
import { formatCurrency } from "@/lib/format";
import { Category, Priority } from "@/lib/types";

const priorityOptions: Priority[] = ["Low", "Medium", "High", "Critical"];
const categoryOptions: Category[] = [
  "maintenance",
  "office supplies",
  "packaging",
  "chemicals",
  "spare parts",
  "electronics",
  "safety equipment",
];

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
  const [selectedItemId, setSelectedItemId] = useState(
    sampleRequestTemplates[0]?.itemId ?? catalogItems[0]?.id ?? "",
  );
  const [itemName, setItemName] = useState(
    catalogItems.find((item) => item.id === (sampleRequestTemplates[0]?.itemId ?? ""))?.name ??
      catalogItems[0]?.name ??
      "",
  );
  const [category, setCategory] = useState<Category>(
    catalogItems.find((item) => item.id === (sampleRequestTemplates[0]?.itemId ?? ""))?.category ??
      catalogItems[0]?.category ??
      "maintenance",
  );
  const [quantity, setQuantity] = useState(sampleRequestTemplates[0]?.quantity ?? 1);
  const [requiredBy, setRequiredBy] = useState(
    futureDate(sampleRequestTemplates[0]?.requiredInDays ?? 7),
  );
  const [budgetMin, setBudgetMin] = useState(sampleRequestTemplates[0]?.budgetMin ?? 1000);
  const [budgetMax, setBudgetMax] = useState(sampleRequestTemplates[0]?.budgetMax ?? 2000);
  const [priority, setPriority] = useState<Priority>(
    sampleRequestTemplates[0]?.priority ?? "High",
  );
  const [minSupplierRating, setMinSupplierRating] = useState(
    sampleRequestTemplates[0]?.minSupplierRating ?? 80,
  );
  const [notes, setNotes] = useState(sampleRequestTemplates[0]?.notes ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => catalogItems.find((item) => item.id === selectedItemId) ?? catalogItems[0],
    [selectedItemId],
  );

  function applyTemplate(templateId: string) {
    const template = sampleRequestTemplates.find((entry) => entry.id === templateId);

    if (!template) {
      return;
    }

    setSelectedItemId(template.itemId);
    setItemName(
      catalogItems.find((item) => item.id === template.itemId)?.name ?? template.label,
    );
    setCategory(
      catalogItems.find((item) => item.id === template.itemId)?.category ?? "maintenance",
    );
    setQuantity(template.quantity);
    setRequiredBy(futureDate(template.requiredInDays));
    setBudgetMin(template.budgetMin);
    setBudgetMax(template.budgetMax);
    setPriority(template.priority);
    setMinSupplierRating(template.minSupplierRating);
    setNotes(template.notes);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setPending(true);
      setError(null);

      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: selectedItemId || undefined,
          itemName,
          category,
          quantity,
          requiredBy,
          budgetMin,
          budgetMax,
          priority,
          minSupplierRating,
          notes,
        }),
      });

      const data = (await response.json()) as { request?: { id: string }; error?: string };

      if (!response.ok || !data.request) {
        throw new Error(data.error ?? "Failed to create request.");
      }

      startTransition(() => {
        router.push(`/?request=${data.request?.id}`);
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Failed to create request.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <form
        onSubmit={handleSubmit}
        className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-8"
      >
        <div className="border-b border-slate-200 pb-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-500">Simple request intake</p>
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-slate-950">
                Create a sourcing brief in one pass
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                The website stays simple: you submit one request, and the Lua agent handles the
                supplier ranking, risk scan, and recommendation.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
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
            <span className="text-sm font-semibold text-slate-700">Item</span>
            <input
              value={itemName}
              onChange={(event) => {
                setItemName(event.target.value);
                const matchingItem = catalogItems.find((item) => item.name === event.target.value);
                setSelectedItemId(matchingItem?.id ?? "");
                setCategory(matchingItem?.category ?? category);
              }}
              placeholder="Example: RFID labels, hydraulic seal kit, or industrial lubricant"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-400 focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as Category)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm capitalize text-slate-900 outline-none transition focus:border-teal-400 focus:bg-white"
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
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
            <span className="text-sm font-semibold text-slate-700">Required by</span>
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
            <span className="text-sm font-semibold text-slate-700">Priority</span>
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

        {error ? (
          <div className="mt-5 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Budget range: {formatCurrency(budgetMin)} to {formatCurrency(budgetMax)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              The Lua agent will use this range as a hard buying constraint.
            </p>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {pending ? "Creating..." : "Create request"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-semibold text-slate-500">Selected item</p>
        <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-slate-950">
          {itemName}
        </h3>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          {selectedItemId
            ? selectedItem?.description
            : "Custom freeform request. ProcurePilot will benchmark this item against the closest supported sourcing category during assessment."}
        </p>

        <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Specs</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {selectedItemId
              ? selectedItem?.technicalSpecs
              : "Use the notes field to provide technical requirements, acceptable equivalents, or supplier constraints for this custom item."}
          </p>
        </div>

        <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">What happens next</p>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
            <li>The request is saved to a real SQLite-backed app database.</li>
            <li>The Lua agent validates the request and ranks suppliers server-side.</li>
            <li>The dashboard refreshes with the recommendation, risk insights, and substitute options.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
