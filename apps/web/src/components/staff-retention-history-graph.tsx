"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type RetentionHistoryItem = {
  risk_assessment_id: string;
  member_name: string;
  risk_level: "high" | "medium";
  review_status: "pending" | "in_progress" | "resolved" | "dismissed";
  evaluated_at: string;
  resolved_at: string | null;
  resolution_reason: string | null;
  previous_visits: number;
  current_visits: number;
  decline_percentage: number;
  outreach_attempts: Array<{ response_outcome: string | null }>;
};

function outcome(item: RetentionHistoryItem) {
  return item.outreach_attempts.at(-1)?.response_outcome ?? item.resolution_reason?.replace(/^response_/, "") ?? null;
}

function isDismissed(item: RetentionHistoryItem) {
  return item.review_status === "dismissed";
}

function isCompleted(item: RetentionHistoryItem) {
  return item.review_status === "resolved" && !isDismissed(item);
}

function isOpen(item: RetentionHistoryItem) {
  return item.review_status === "pending" || item.review_status === "in_progress";
}

export function StaffRetentionHistoryGraph({ cases }: { cases: RetentionHistoryItem[] }) {
  const [status, setStatus] = useState<"all" | "open" | "completed" | "dismissed">("all");
  const [risk, setRisk] = useState<"all" | "high" | "medium">("all");
  const [sort, setSort] = useState<"date" | "risk" | "decline">("date");
  const formatter = useMemo(() => new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }), []);
  const riskRank = { high: 0, medium: 1 } as const;
  const visible = cases
    .filter((item) => risk === "all" || item.risk_level === risk)
    .filter((item) => status === "all" || (status === "open" ? isOpen(item) : status === "completed" ? isCompleted(item) : isDismissed(item)))
    .sort((a, b) => sort === "date"
      ? new Date(b.evaluated_at).getTime() - new Date(a.evaluated_at).getTime() || b.decline_percentage - a.decline_percentage
      : sort === "risk"
        ? riskRank[a.risk_level] - riskRank[b.risk_level] || b.decline_percentage - a.decline_percentage
        : b.decline_percentage - a.decline_percentage || new Date(b.evaluated_at).getTime() - new Date(a.evaluated_at).getTime());
  const maxVisits = Math.max(...cases.flatMap((item) => [item.previous_visits, item.current_visits]), 1);
  const sortLabel = sort === "date" ? "Date · newest first" : sort === "risk" ? "Risk · highest first" : "Decline · largest first";

  return (
    <section aria-labelledby="case-history-heading" className="glass-panel mb-8 rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#a9231e]">Evaluation history</p>
          <h2 id="case-history-heading" className="mt-2 text-2xl font-semibold">Attendance change by member</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">{sortLabel}</span>
            <p className="text-sm text-black/65">Choose which cases to compare and how they are arranged.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-semibold">
          <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-black/25" />Previous visits</span>
          <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#c72c25]" />Open</span>
          <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-sky-600" />Completed</span>
          <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-black/50" />Dismissed</span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 rounded-2xl border border-black/10 bg-white/60 p-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_13rem_auto] xl:items-end">
        <fieldset>
          <legend className="text-sm font-semibold">Case status</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {([['all', 'All cases'], ['open', 'Open'], ['completed', 'Completed'], ['dismissed', 'Dismissed']] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)} className={`min-h-11 rounded-full px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 ${status === value ? "bg-black text-white" : "border border-black/15 bg-white/70 hover:bg-black/[0.06]"}`}>{label}</button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-semibold">Risk level</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {([['all', 'All risks'], ['high', 'High risk'], ['medium', 'Medium risk']] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={risk === value} onClick={() => setRisk(value)} className={`min-h-11 rounded-full px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 ${risk === value ? "bg-black text-white" : "border border-black/15 bg-white/70 hover:bg-black/[0.06]"}`}>{label}</button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="history-sort" className="text-sm font-semibold">Arrange by</label>
          <select id="history-sort" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="mt-2 min-h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">
            <option value="date">Date · newest first</option>
            <option value="risk">Risk · highest first</option>
            <option value="decline">Decline · largest first</option>
          </select>
        </div>
        <p className="rounded-full bg-black px-3 py-1 text-center text-xs font-semibold text-white" aria-live="polite">Showing {visible.length} of {cases.length}</p>
      </div>

      {!visible.length ? (
        <div className="mt-6 rounded-2xl bg-white/70 p-6 text-center">
          <h3 className="text-lg font-semibold">No cases match this view</h3>
          <p className="mt-2 text-sm text-black/65">Choose All cases or another risk group to continue.</p>
          <button type="button" onClick={() => { setStatus("all"); setRisk("all"); }} className="mt-4 min-h-11 rounded-full bg-black px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Show all cases</button>
        </div>
      ) : null}

      <div className="mt-6 space-y-4" role="group" aria-label="Bar chart comparing each member's visits in the previous and current 30-day periods">
        {visible.map((item) => {
          const completed = isCompleted(item);
          const dismissed = isDismissed(item);
          const recordedOutcome = outcome(item);
          const currentColor = completed ? "bg-sky-600" : dismissed ? "bg-black/50" : "bg-[#c72c25]";
          return (
            <article key={item.risk_assessment_id} className="grid gap-2 rounded-2xl p-3 transition hover:bg-black/[0.04] sm:grid-cols-[11rem_minmax(0,1fr)_7rem] sm:items-center">
              <div className="min-w-0">
                <Link href={`/staff/retention/${encodeURIComponent(item.risk_assessment_id)}`} className="block truncate text-sm font-semibold underline decoration-black/30 underline-offset-4 transition hover:text-[#a9231e] hover:decoration-[#a9231e] focus-visible:rounded focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">{item.member_name}</Link>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${completed ? "bg-sky-100 text-sky-950" : dismissed ? "bg-black/10 text-black" : item.risk_level === "high" ? "bg-[#c72c25] text-white" : "bg-amber-100 text-amber-950"}`}>{completed ? "✓ Completed" : dismissed ? "Dismissed" : `${item.risk_level} risk`}</span>
                  <span className="text-xs text-black/60">{formatter.format(new Date(item.evaluated_at))}</span>
                </div>
                {recordedOutcome ? <p className="mt-1 truncate text-xs capitalize text-black/60">{recordedOutcome.replaceAll("_", " ")}</p> : null}
              </div>
              <div className="space-y-1.5" aria-label={`${item.member_name}: ${item.previous_visits} previous visits and ${item.current_visits} current visits`}>
                <div className="flex h-3 items-center"><span className="h-2.5 min-w-1 rounded-full bg-black/25" style={{ width: `${(item.previous_visits / maxVisits) * 100}%` }} /></div>
                <div className="flex h-3 items-center"><span className={`h-2.5 min-w-1 rounded-full ${currentColor}`} style={{ width: `${(item.current_visits / maxVisits) * 100}%` }} /></div>
              </div>
              <div className="flex items-center justify-between gap-2 sm:block sm:text-right"><span className="text-xs text-black/60 sm:hidden">Decline</span><p className={`text-lg font-semibold ${completed ? "text-sky-800" : dismissed ? "text-black/65" : item.risk_level === "high" ? "text-[#8e211c]" : "text-amber-800"}`}>−{item.decline_percentage}%</p></div>
            </article>
          );
        })}
      </div>
      <div className="mt-5 grid grid-cols-4 text-center text-xs text-black/60 sm:ml-[11rem]"><span>0</span><span>{Math.round(maxVisits / 3)}</span><span>{Math.round((maxVisits * 2) / 3)}</span><span>{maxVisits} visits</span></div>
      <p className="mt-4 text-center text-xs font-medium text-black/60">Select a member’s name to open their complete case and continue the journey.</p>
    </section>
  );
}
