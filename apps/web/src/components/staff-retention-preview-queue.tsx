"use client";

import { useState } from "react";
import Link from "next/link";

import type { RetentionPreviewCase } from "@/lib/staff-retention-preview-data";

export type { RetentionPreviewCase } from "@/lib/staff-retention-preview-data";

export function StaffRetentionPreviewQueue({ cases }: { cases: RetentionPreviewCase[] }) {
  const [riskView, setRiskView] = useState<"all" | RetentionPreviewCase["priority"]>("all");
  const [graphSort, setGraphSort] = useState<"date" | "risk" | "decline">("date");
  const riskRank = { high: 0, medium: 1, low: 2 } as const;
  const chartCases = cases
    .filter((item) => riskView === "all" || item.priority === riskView)
    .sort((a, b) => graphSort === "date"
      ? new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime() || b.decline - a.decline
      : graphSort === "risk"
        ? riskRank[a.priority] - riskRank[b.priority] || b.decline - a.decline
        : b.decline - a.decline || new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime());
  const maxVisits = Math.max(...cases.flatMap((item) => [item.previous, item.current]), 1);

  return (
    <section aria-labelledby="preview-queue-heading" className="mt-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#a9231e]">Member evaluations</p>
        <h2 id="preview-queue-heading" className="mt-2 text-2xl font-semibold">Explore retention cases</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-black/65">Choose a view, then select a member’s name in the graph to open their complete case below.</p>
      </div>

      <section aria-labelledby="retention-chart-heading" className="glass-panel mt-5 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="font-mono text-xs uppercase tracking-[0.16em] text-[#a9231e]">Evaluation history</p><h3 id="retention-chart-heading" className="mt-2 text-xl font-semibold">Attendance change by member</h3><div className="mt-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">{graphSort === "date" ? "Date · newest first" : graphSort === "risk" ? "Risk · highest first" : "Decline · largest first"}</span><p className="text-sm text-black/65">Choose which members to compare and how they are arranged.</p></div></div>
          <div className="flex flex-wrap gap-3 text-xs font-semibold"><span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-black/25" />Previous visits</span><span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#c72c25]" />High risk</span><span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-amber-500" />Medium risk</span><span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-emerald-600" />Monitoring</span></div>
        </div>
        <div className="mt-5 grid gap-4 rounded-2xl border border-black/10 bg-white/60 p-4 lg:grid-cols-[minmax(0,1fr)_13rem_auto] lg:items-end">
          <fieldset>
            <legend className="text-sm font-semibold">Show in graph</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {([['all', 'All members'], ['high', 'High risk'], ['medium', 'Medium risk'], ['low', 'Monitoring']] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setRiskView(value)} aria-pressed={riskView === value} className={`min-h-11 rounded-full px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 ${riskView === value ? "bg-black text-white" : "border border-black/15 bg-white/70 text-black hover:bg-black/[0.06]"}`}>{label}</button>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="graph-sort" className="text-sm font-semibold">Arrange by</label>
            <select id="graph-sort" value={graphSort} onChange={(event) => setGraphSort(event.target.value as typeof graphSort)} className="mt-2 min-h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">
              <option value="date">Date · newest first</option><option value="risk">Risk · highest first</option><option value="decline">Decline · largest first</option>
            </select>
          </div>
          <p className="rounded-full bg-black px-3 py-1 text-center text-xs font-semibold text-white" aria-live="polite">Showing {chartCases.length} of {cases.length}</p>
        </div>
        <div className="mt-6 space-y-4" role="group" aria-label="Bar chart comparing each member's visits in the previous and current 30-day periods">
          {chartCases.map((item) => (
            <div key={item.id} className="grid w-full gap-2 rounded-2xl p-3 text-left transition hover:bg-black/[0.04] sm:grid-cols-[10rem_minmax(0,1fr)_4rem] sm:items-center">
              <div className="min-w-0"><Link href={`/staff/preview/retention/${encodeURIComponent(item.id)}`} target="_blank" rel="noreferrer" className="block max-w-full truncate text-left text-sm font-semibold underline decoration-black/30 underline-offset-4 transition hover:text-[#a9231e] hover:decoration-[#a9231e] focus-visible:rounded focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">{item.member}<span className="sr-only"> (opens case in a new tab)</span></Link><div className="mt-1 flex flex-wrap items-center gap-1.5"><span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${item.priority === "high" ? "bg-[#c72c25] text-white" : item.priority === "medium" ? "bg-amber-100 text-amber-950" : "bg-emerald-100 text-emerald-950"}`}>{item.priority === "low" ? "Monitoring" : `${item.priority} risk`}</span><span className="text-xs text-black/60">{item.evaluatedAt}</span></div></div>
              <div className="space-y-1.5" aria-label={`${item.member}: ${item.previous} previous visits, ${item.current} current visits`}>
                <div className="flex h-3 items-center"><span className="h-2.5 min-w-1 rounded-full bg-black/25" style={{ width: `${(item.previous / maxVisits) * 100}%` }} /></div>
                <div className="flex h-3 items-center"><span className={`h-2.5 min-w-1 rounded-full ${item.priority === "high" ? "bg-[#c72c25]" : item.priority === "medium" ? "bg-amber-500" : "bg-emerald-600"}`} style={{ width: `${(item.current / maxVisits) * 100}%` }} /></div>
              </div>
              <div className="flex items-center justify-between gap-2 sm:block sm:text-right"><span className="text-xs text-black/60 sm:hidden">Decline</span><p className={`text-lg font-semibold ${item.priority === "high" ? "text-[#8e211c]" : item.priority === "medium" ? "text-amber-800" : "text-emerald-800"}`}>−{item.decline}%</p></div>
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-4 text-center text-xs text-black/60 sm:ml-[10rem]"><span>0</span><span>{Math.round(maxVisits / 3)}</span><span>{Math.round((maxVisits * 2) / 3)}</span><span>{maxVisits} visits</span></div>
        <p className="mt-4 text-center text-xs font-medium text-black/60">Select a member’s name to open their complete case page.</p>
      </section>

    </section>
  );
}
