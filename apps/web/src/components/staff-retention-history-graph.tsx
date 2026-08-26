"use client";

import Link from "next/link";
import { useState } from "react";

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

function dismissed(item: RetentionHistoryItem) {
  return item.review_status === "dismissed";
}

export function StaffRetentionHistoryGraph({ cases }: { cases: RetentionHistoryItem[] }) {
  const [status, setStatus] = useState<"all" | "open" | "completed" | "dismissed">("all");
  const [risk, setRisk] = useState<"all" | "high" | "medium">("all");
  const visible = cases
    .filter((item) => risk === "all" || item.risk_level === risk)
    .filter((item) => status === "all" || (status === "open" ? item.review_status === "pending" || item.review_status === "in_progress" : status === "completed" ? item.review_status === "resolved" && !dismissed(item) : dismissed(item)))
    .sort((a, b) => new Date(b.evaluated_at).getTime() - new Date(a.evaluated_at).getTime());
  const maxVisits = Math.max(...cases.flatMap((item) => [item.previous_visits, item.current_visits]), 1);
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });

  return (
    <section aria-labelledby="case-history-heading" className="glass-panel mb-8 rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="font-mono text-xs uppercase tracking-[0.16em] text-[#a9231e]">Authoritative case history</p><h2 id="case-history-heading" className="mt-2 text-2xl font-semibold">Attendance change and review outcomes</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-black/65">Every bar comes from a Product D case in Supabase. Completed reviews remain visible as history and do not count as active work.</p></div>
        <div className="flex flex-wrap gap-3 text-xs font-semibold"><span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-black/25" />Previous</span><span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#c72c25]" />Open</span><span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-sky-600" />Completed</span><span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-black/50" />Dismissed</span></div>
      </div>
      <div className="mt-5 grid gap-4 rounded-2xl bg-white/60 p-4 lg:grid-cols-2">
        <fieldset><legend className="text-sm font-semibold">Case status</legend><div className="mt-2 flex flex-wrap gap-2">{([['all','All cases'],['open','Open'],['completed','Completed'],['dismissed','Dismissed']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)} className={`min-h-11 rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 ${status === value ? "bg-black text-white" : "border border-black/15 bg-white"}`}>{label}</button>)}</div></fieldset>
        <fieldset><legend className="text-sm font-semibold">Risk level</legend><div className="mt-2 flex flex-wrap gap-2">{([['all','All risks'],['high','High'],['medium','Medium']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={risk === value} onClick={() => setRisk(value)} className={`min-h-11 rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 ${risk === value ? "bg-black text-white" : "border border-black/15 bg-white"}`}>{label}</button>)}</div></fieldset>
      </div>
      <p className="mt-4 text-sm font-semibold" aria-live="polite">Showing {visible.length} of {cases.length} cases · newest first</p>
      {!visible.length ? <div className="mt-4 rounded-2xl bg-white/70 p-6 text-center text-sm text-black/65">No cases match these filters.</div> : <div className="mt-5 space-y-3">{visible.map((item) => {
        const isDismissed = dismissed(item);
        const isCompleted = item.review_status === "resolved" && !isDismissed;
        const recordedOutcome = outcome(item);
        return <article key={item.risk_assessment_id} className="grid gap-3 rounded-2xl p-3 hover:bg-black/[0.04] sm:grid-cols-[11rem_minmax(0,1fr)_8rem] sm:items-center"><div className="min-w-0"><Link href={`/staff/retention/${encodeURIComponent(item.risk_assessment_id)}`} className="block truncate text-sm font-semibold underline decoration-black/30 underline-offset-4 hover:text-[#a9231e] focus-visible:rounded focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">{item.member_name}</Link><p className="mt-1 text-xs text-black/60">{formatter.format(new Date(item.evaluated_at))}</p></div><div className="space-y-1.5" aria-label={`${item.member_name}: ${item.previous_visits} previous visits and ${item.current_visits} current visits`}><div className="h-2.5 rounded-full bg-black/25" style={{ width: `${(item.previous_visits / maxVisits) * 100}%` }} /><div className={`h-2.5 rounded-full ${isCompleted ? "bg-sky-600" : isDismissed ? "bg-black/50" : "bg-[#c72c25]"}`} style={{ width: `${(item.current_visits / maxVisits) * 100}%` }} /></div><div className="sm:text-right"><p className="text-sm font-semibold capitalize">{isCompleted ? "✓ Completed" : isDismissed ? "Dismissed" : item.review_status.replaceAll("_", " ")}</p>{recordedOutcome ? <p className="mt-1 text-xs capitalize text-black/60">{recordedOutcome.replaceAll("_", " ")}</p> : null}</div></article>;
      })}</div>}
    </section>
  );
}
