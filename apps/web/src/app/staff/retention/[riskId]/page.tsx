import Link from "next/link";
import { notFound } from "next/navigation";

import { MemberStatusMessage } from "@/components/member-status-message";
import { PortalShell } from "@/components/portal-shell";
import { requireStaff } from "@/lib/auth";
import { staffLinks } from "@/lib/staff-navigation";

type Note = { note_id: string; body: string; author_name: string; created_at: string };
type Evidence = { attendance_record_id: string; class_type: string; starts_at: string };
type Outreach = {
  outreach_id: string;
  attempt_number: number;
  channel: "email" | "sms" | "phone";
  original_message: string;
  final_message: string | null;
  status: "draft" | "ready" | "sent" | "completed";
  response_outcome: string | null;
  sent_at: string | null;
  cooldown_until: string | null;
};
type RiskDetail = {
  risk_assessment_id: string;
  member_name: string;
  email: string;
  phone: string | null;
  preferred_channel: string;
  do_not_contact: boolean;
  risk_level: string;
  review_status: string;
  risk_reason: string;
  previous_visits: number;
  current_visits: number;
  decline_percentage: number;
  previous_period_start: string;
  previous_period_end: string;
  current_period_start: string;
  current_period_end: string;
  attendance_evidence: Evidence[];
  active_notes: Note[];
  outreach_attempts: Outreach[];
  recommended_class_type_label: string | null;
  recommended_starts_at: string | null;
  recommended_instructor_name: string | null;
  recommended_available_spots: number | null;
};

const formatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export default async function RetentionDetailPage({ params, searchParams }: { params: Promise<{ riskId: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const { riskId } = await params;
  const messages = await searchParams;
  const { supabase } = await requireStaff();
  const { data, error } = await supabase.rpc("product_d_member_detail", { p_risk_assessment_id: riskId }).maybeSingle();
  if (!data && !error) notFound();
  const detail = data as RiskDetail | null;
  const latest = detail?.outreach_attempts.at(-1);
  const journeyLabel = detail?.review_status === "pending" ? "Start review" : detail?.review_status === "resolved" || detail?.review_status === "dismissed" ? "View recorded outcome" : "Continue case journey";

  return (
    <PortalShell audience="staff" eyebrow="Staff portal · Product D" title={detail?.member_name ?? "Retention case"} description={detail?.risk_reason ?? "Review factual attendance evidence and staff-approved outreach."} links={staffLinks}>
      <MemberStatusMessage success={messages.success} error={messages.error ?? (error ? "The retention case could not be loaded. Refresh and try again." : undefined)} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><Link href="/staff/retention" className="inline-flex min-h-11 items-center rounded-full px-2 text-sm font-semibold underline decoration-[#c72c25] decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">← Member retention</Link><Link href={`/staff/retention/${encodeURIComponent(riskId)}/journey`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-[#c72c25] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">{journeyLabel} →</Link></div>
      {detail && (
        <div className="space-y-6">
          <section aria-label="Case summary" className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-black/10 bg-white/60 p-5"><p className="text-3xl font-semibold">{detail.previous_visits}</p><p className="mt-1 text-sm text-black/65">Previous-period visits</p></div>
            <div className="rounded-3xl border border-black/10 bg-white/60 p-5"><p className="text-3xl font-semibold">{detail.current_visits}</p><p className="mt-1 text-sm text-black/65">Current-period visits</p></div>
            <div className="rounded-3xl bg-[#c72c25] p-5 text-white"><p className="text-3xl font-semibold">−{detail.decline_percentage}%</p><p className="mt-1 text-sm text-white/80">Attendance change</p></div>
          </section>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(24rem,1.2fr)]">
          <div className="space-y-6">
            <section className="glass-panel rounded-3xl p-6">
              <div className="flex flex-wrap gap-2"><span className="rounded-full border border-black/20 bg-white/55 px-2.5 py-1 text-xs font-semibold uppercase text-[#a9231e]">{detail.risk_level} risk</span><span className="rounded-full border border-black/20 bg-white/55 px-2.5 py-1 text-xs font-semibold uppercase">{detail.review_status.replace("_", " ")}</span></div>
              <h2 className="mt-5 text-2xl font-semibold">Member context</h2>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-black/65">Email</dt><dd className="mt-1 break-all font-semibold">{detail.email}</dd></div><div><dt className="text-black/65">Phone</dt><dd className="mt-1 font-semibold">{detail.phone ?? "Not provided"}</dd></div><div><dt className="text-black/65">Preferred channel</dt><dd className="mt-1 font-semibold capitalize">{detail.preferred_channel}</dd></div><div><dt className="text-black/65">Contact permission</dt><dd className={`mt-1 font-semibold ${detail.do_not_contact ? "text-[#a9231e]" : ""}`}>{detail.do_not_contact ? "Do not contact" : "Contact permitted"}</dd></div></dl>
              <p className="mt-2 text-xs text-black/60">Previous: {formatter.format(new Date(detail.previous_period_start))}–{formatter.format(new Date(detail.previous_period_end))}<br />Current: {formatter.format(new Date(detail.current_period_start))}–{formatter.format(new Date(detail.current_period_end))}</p>
            </section>

            <section className="glass-panel rounded-3xl p-6">
              <h2 className="text-2xl font-semibold">Attendance evidence</h2>
              <div className="mt-4 space-y-3">{detail.attendance_evidence.length ? detail.attendance_evidence.map((item) => <div key={item.attendance_record_id} className="border-t border-black/10 pt-3 text-sm"><strong className="capitalize">{item.class_type}</strong><span className="ml-2 text-black/65">{formatter.format(new Date(item.starts_at))}</span></div>) : <p className="text-sm text-black/65">No attended sessions in the comparison periods.</p>}</div>
            </section>

            <section className="glass-panel rounded-3xl p-6">
              <h2 className="text-2xl font-semibold">Coworker notes</h2>
              <p className="mt-2 text-sm text-black/65">Read-only context. Workflow changes are completed from the Case Journey.</p><div className="mt-5 space-y-3">{detail.active_notes.length ? detail.active_notes.map((note) => <article key={note.note_id} className="border-t border-black/10 pt-3"><p className="text-sm leading-6">{note.body}</p><p className="mt-2 text-xs text-black/60">{note.author_name} · {formatter.format(new Date(note.created_at))}</p></article>) : <p className="text-sm text-black/65">No staff notes yet.</p>}</div>
            </section>
          </div>

          <div className="space-y-6">
            {detail.recommended_starts_at && <section className="glass-panel rounded-3xl p-6"><p className="font-mono text-xs uppercase tracking-[0.15em] text-black/60">Recommended return class</p><h2 className="mt-3 text-2xl font-semibold">{detail.recommended_class_type_label}</h2><p className="mt-2 text-sm text-black/60">{formatter.format(new Date(detail.recommended_starts_at))} with {detail.recommended_instructor_name} · {detail.recommended_available_spots} spots</p></section>}

            <section className="glass-panel rounded-3xl p-6"><p className="font-mono text-xs uppercase tracking-[0.15em] text-black/60">Workflow status</p><h2 className="mt-3 text-2xl font-semibold capitalize">{latest?.status ?? detail.review_status.replaceAll("_", " ")}</h2><p className="mt-2 text-sm leading-6 text-black/65">Complete review, outreach, follow-up, dismissal, and resolution from the dedicated Case Journey.</p><Link href={`/staff/retention/${encodeURIComponent(riskId)}/journey`} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#c72c25] px-5 text-sm font-semibold text-white">{journeyLabel}</Link></section>
          </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}
