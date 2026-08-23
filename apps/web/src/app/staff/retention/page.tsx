import Link from "next/link";

import { PortalShell } from "@/components/portal-shell";
import { requireStaff } from "@/lib/auth";

const links = [
  { href: "/staff", label: "Overview" },
  { href: "/staff/rosters", label: "Rosters" },
  { href: "/staff/retention", label: "Member retention" },
];

type RiskQueueItem = {
  risk_assessment_id: string;
  member_name: string;
  risk_level: "high" | "medium";
  review_status: "pending" | "in_progress";
  risk_reason: string;
  last_attended_at: string | null;
  active_note_count: number;
  outreach_status: string | null;
  outreach_blocked_reason: string | null;
};

const formatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });

export default async function RetentionQueuePage() {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase
    .from("product_d_risk_queue")
    .select("risk_assessment_id,member_name,risk_level,review_status,risk_reason,last_attended_at,active_note_count,outreach_status,outreach_blocked_reason")
    .order("risk_priority", { ascending: true })
    .order("evaluated_at", { ascending: true });
  const cases = (data ?? []) as RiskQueueItem[];

  return (
    <PortalShell eyebrow="Staff portal · Product D" title="Members needing attention" description="Prioritized attendance-decline cases with factual evidence, coworker notes, and controlled outreach." links={links}>
      {error ? (
        <div role="alert" className="border border-[#c72c25]/35 bg-[#c72c25]/5 p-6 text-sm text-[#8e211c]">The retention queue could not be loaded.</div>
      ) : cases.length === 0 ? (
        <div className="glass-panel rounded-3xl p-8"><h2 className="text-2xl font-semibold">The queue is clear</h2><p className="mt-2 text-sm text-black/60">There are no pending or in-progress attendance-decline cases.</p></div>
      ) : (
        <div className="space-y-4">
          {cases.map((item) => (
            <article key={item.risk_assessment_id} className="glass-panel grid gap-5 rounded-3xl p-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className={`border px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.15em] ${item.risk_level === "high" ? "border-[#c72c25] text-[#a9231e]" : "border-amber-600 text-amber-800"}`}>{item.risk_level} risk</span>
                  <span className="border border-black/20 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.15em]">{item.review_status.replace("_", " ")}</span>
                  <span className="border border-black/20 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.15em]">Outreach: {item.outreach_status ?? "not started"}</span>
                </div>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">{item.member_name}</h2>
                <p className="mt-2 text-sm font-medium">{item.risk_reason}</p>
                <p className="mt-1 text-sm text-black/55">Last attended: {item.last_attended_at ? formatter.format(new Date(item.last_attended_at)) : "No recorded attendance"} · {item.active_note_count} note{item.active_note_count === 1 ? "" : "s"}</p>
                {item.outreach_blocked_reason && <p className="mt-2 text-xs text-[#8e211c]">{item.outreach_blocked_reason}</p>}
              </div>
              <Link href={`/staff/retention/${encodeURIComponent(item.risk_assessment_id)}`} className="inline-flex min-h-11 items-center justify-center bg-black px-5 text-sm font-semibold text-white transition hover:bg-[#c72c25] focus-visible:outline-2 focus-visible:outline-offset-2">Review case</Link>
            </article>
          ))}
        </div>
      )}
    </PortalShell>
  );
}

