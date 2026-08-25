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
  evaluated_at: string;
  previous_visits: number;
  current_visits: number;
  decline_percentage: number;
  last_attended_at: string | null;
  active_note_count: number;
  outreach_status: "draft" | "ready" | "sent" | "completed" | null;
  outreach_blocked_reason: string | null;
};

const formatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });

function nextAction(item: RiskQueueItem) {
  if (item.review_status === "pending") return "Start review";
  if (item.outreach_status === "draft") return "Review draft";
  if (item.outreach_status === "ready") return "Send outreach";
  if (item.outreach_status === "sent") return "Record response";
  return "Continue case";
}

function CaseCard({ item }: { item: RiskQueueItem }) {
  return (
    <article className="glass-panel grid h-full gap-5 rounded-3xl p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${item.risk_level === "high" ? "bg-[#c72c25] text-white" : "bg-amber-100 text-amber-900"}`}>{item.risk_level} priority</span>
          <span className="rounded-full border border-black/15 bg-white/60 px-2.5 py-1 text-xs font-semibold capitalize">{item.review_status.replace("_", " ")}</span>
          {item.outreach_status && <span className="rounded-full border border-black/15 bg-white/60 px-2.5 py-1 text-xs font-semibold capitalize">Outreach {item.outreach_status}</span>}
        </div>
        <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{item.member_name}</h3>
        <div className="mt-4 grid max-w-xl grid-cols-3 gap-2" aria-label="Attendance change">
          <div className="rounded-2xl bg-white/55 p-3"><p className="text-2xl font-semibold">{item.previous_visits}</p><p className="text-xs text-black/65">Previous visits</p></div>
          <div className="rounded-2xl bg-white/55 p-3"><p className="text-2xl font-semibold">{item.current_visits}</p><p className="text-xs text-black/65">Current visits</p></div>
          <div className="rounded-2xl bg-white/55 p-3"><p className="text-2xl font-semibold text-[#a9231e]">−{item.decline_percentage}%</p><p className="text-xs text-black/65">Attendance</p></div>
        </div>
        <p className="mt-4 text-sm text-black/70">Last attended: {item.last_attended_at ? formatter.format(new Date(item.last_attended_at)) : "No recorded attendance"} · {item.active_note_count} staff note{item.active_note_count === 1 ? "" : "s"}</p>
        {item.outreach_blocked_reason && <p className="mt-2 text-sm font-medium text-[#8e211c]">{item.outreach_blocked_reason}</p>}
      </div>
      <Link href={`/staff/retention/${encodeURIComponent(item.risk_assessment_id)}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-[#c72c25] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">{nextAction(item)}</Link>
    </article>
  );
}

function CaseSection({ title, description, cases }: { title: string; description: string; cases: RiskQueueItem[] }) {
  if (!cases.length) return null;
  const id = `${title.toLowerCase().replaceAll(" ", "-")}-heading`;
  return (
    <section aria-labelledby={id}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div><h2 id={id} className="text-2xl font-semibold">{title}</h2><p className="mt-1 text-sm text-black/65">{description}</p></div>
        <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">{cases.length}</span>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">{cases.map((item) => <CaseCard key={item.risk_assessment_id} item={item} />)}</div>
    </section>
  );
}

export default async function RetentionQueuePage() {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase
    .from("product_d_risk_queue")
    .select("risk_assessment_id,member_name,risk_level,review_status,evaluated_at,previous_visits,current_visits,decline_percentage,last_attended_at,active_note_count,outreach_status,outreach_blocked_reason")
    .order("risk_priority", { ascending: true })
    .order("evaluated_at", { ascending: true });
  const cases = (data ?? []) as RiskQueueItem[];
  const pending = cases.filter((item) => item.review_status === "pending");
  const inProgress = cases.filter((item) => item.review_status === "in_progress");
  const highPriority = cases.filter((item) => item.risk_level === "high").length;

  return (
    <PortalShell audience="staff" eyebrow="Staff portal · Product D" title="Member retention" description="Review attendance decline, coordinate staff notes, and complete member outreach from one prioritized workspace." links={links}>
      {error ? (
        <div role="alert" className="rounded-2xl border border-black/15 bg-white/65 p-6 text-sm text-[#8e211c] backdrop-blur-xl">The retention queue could not be loaded.</div>
      ) : cases.length === 0 ? (
        <div className="glass-panel rounded-3xl p-8"><h2 className="text-2xl font-semibold">The queue is clear</h2><p className="mt-2 text-sm text-black/65">There are no pending or in-progress attendance-decline cases.</p></div>
      ) : (
        <div className="space-y-10">
          <section aria-label="Retention queue summary" className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl bg-black p-5 text-white"><p className="text-3xl font-semibold">{cases.length}</p><p className="mt-1 text-sm text-white/70">Open cases</p></div>
            <div className="rounded-3xl bg-[#c72c25] p-5 text-white"><p className="text-3xl font-semibold">{highPriority}</p><p className="mt-1 text-sm text-white/80">High priority</p></div>
            <div className="rounded-3xl border border-black/10 bg-white/60 p-5"><p className="text-3xl font-semibold">{inProgress.length}</p><p className="mt-1 text-sm text-black/65">In progress</p></div>
          </section>
          <CaseSection title="Ready for review" description="Newly identified members who have not been assessed by staff." cases={pending} />
          <CaseSection title="In progress" description="Cases with notes, draft outreach, or a response still to record." cases={inProgress} />
        </div>
      )}
    </PortalShell>
  );
}
