import Link from "next/link";
import { notFound } from "next/navigation";

import { approveOutreach, completeOutreach, createRiskNote, dismissRiskCase, editOutreachDraft, sendOutreach, startRiskReview } from "@/app/staff/actions";
import { MemberStatusMessage } from "@/components/member-status-message";
import { PortalShell } from "@/components/portal-shell";
import { requireStaff } from "@/lib/auth";

const links = [
  { href: "/staff", label: "Overview" },
  { href: "/staff/rosters", label: "Rosters" },
  { href: "/staff/retention", label: "Member retention" },
];

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
  const { data, error } = await supabase.from("product_d_member_detail").select("*").eq("risk_assessment_id", riskId).maybeSingle();
  if (!data && !error) notFound();
  const detail = data as RiskDetail | null;
  const latest = detail?.outreach_attempts.at(-1);

  return (
    <PortalShell eyebrow="Staff portal · Product D" title={detail?.member_name ?? "Retention case"} description={detail?.risk_reason ?? "Review factual attendance evidence and staff-approved outreach."} links={links}>
      <MemberStatusMessage success={messages.success} error={messages.error ?? error?.message} />
      <Link href="/staff/retention" className="mb-6 inline-flex text-sm font-semibold underline underline-offset-4">← Retention queue</Link>
      {detail && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(24rem,1.2fr)]">
          <div className="space-y-6">
            <section className="glass-panel rounded-3xl p-6">
              <div className="flex flex-wrap gap-2"><span className="border border-[#c72c25] px-2.5 py-1 text-xs font-semibold uppercase text-[#a9231e]">{detail.risk_level} risk</span><span className="border border-black/20 px-2.5 py-1 text-xs font-semibold uppercase">{detail.review_status.replace("_", " ")}</span></div>
              <h2 className="mt-5 text-2xl font-semibold">Contact and evidence</h2>
              <p className="mt-3 text-sm text-black/60">{detail.email}{detail.phone ? ` · ${detail.phone}` : " · No phone"}</p>
              <p className="mt-1 text-sm text-black/60">Preferred: {detail.preferred_channel}{detail.do_not_contact ? " · Do not contact" : ""}</p>
              <p className="mt-5 text-sm font-semibold">{detail.risk_reason}</p>
              <p className="mt-2 text-xs text-black/50">Previous: {formatter.format(new Date(detail.previous_period_start))}–{formatter.format(new Date(detail.previous_period_end))}<br />Current: {formatter.format(new Date(detail.current_period_start))}–{formatter.format(new Date(detail.current_period_end))}</p>
              {detail.review_status === "pending" && <form action={startRiskReview} className="mt-5"><input type="hidden" name="risk_assessment_id" value={riskId} /><button className="min-h-11 bg-black px-5 text-sm font-semibold text-white">Start review</button></form>}
            </section>

            <section className="glass-panel rounded-3xl p-6">
              <h2 className="text-2xl font-semibold">Attendance evidence</h2>
              <div className="mt-4 space-y-3">{detail.attendance_evidence.length ? detail.attendance_evidence.map((item) => <div key={item.attendance_record_id} className="border-t border-black/10 pt-3 text-sm"><strong className="capitalize">{item.class_type}</strong><span className="ml-2 text-black/55">{formatter.format(new Date(item.starts_at))}</span></div>) : <p className="text-sm text-black/55">No attended sessions in the comparison periods.</p>}</div>
            </section>

            <section className="glass-panel rounded-3xl p-6">
              <h2 className="text-2xl font-semibold">Coworker notes</h2>
              <form action={createRiskNote} className="mt-4"><input type="hidden" name="risk_assessment_id" value={riskId} /><label className="text-sm font-semibold" htmlFor="note-body">Add factual context</label><textarea id="note-body" name="body" required rows={3} className="mt-2 w-full border border-black/20 bg-white/60 p-3 focus-visible:outline-2" /><button className="mt-3 min-h-11 bg-black px-5 text-sm font-semibold text-white">Add note</button></form>
              <div className="mt-5 space-y-3">{detail.active_notes.map((note) => <article key={note.note_id} className="border-t border-black/10 pt-3"><p className="text-sm leading-6">{note.body}</p><p className="mt-2 text-xs text-black/45">{note.author_name} · {formatter.format(new Date(note.created_at))}</p></article>)}</div>
            </section>
          </div>

          <div className="space-y-6">
            {detail.recommended_starts_at && <section className="glass-panel rounded-3xl p-6"><p className="font-mono text-xs uppercase tracking-[0.15em] text-black/50">Recommended return class</p><h2 className="mt-3 text-2xl font-semibold">{detail.recommended_class_type_label}</h2><p className="mt-2 text-sm text-black/60">{formatter.format(new Date(detail.recommended_starts_at))} with {detail.recommended_instructor_name} · {detail.recommended_available_spots} spots</p></section>}

            <section className="glass-panel rounded-3xl p-6">
              <h2 className="text-2xl font-semibold">Outreach workflow</h2>
              {!latest ? <p className="mt-3 text-sm text-black/55">No outreach draft exists for this case.</p> : (
                <>
                  <div className="mt-3 flex gap-2"><span className="border border-black/20 px-2.5 py-1 text-xs font-semibold uppercase">Attempt {latest.attempt_number}</span><span className="border border-black/20 px-2.5 py-1 text-xs font-semibold uppercase">{latest.status}</span></div>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-black/50">Original message</p><p className="mt-2 border-l-2 border-black/20 pl-4 text-sm leading-6 text-black/60">{latest.original_message}</p>
                  {latest.status === "draft" && <form action={editOutreachDraft} className="mt-5 space-y-3"><input type="hidden" name="risk_assessment_id" value={riskId} /><input type="hidden" name="outreach_id" value={latest.outreach_id} /><label className="text-sm font-semibold" htmlFor="final-message">Staff-reviewed message</label><textarea id="final-message" name="final_message" required defaultValue={latest.final_message ?? latest.original_message} rows={7} className="w-full border border-black/20 bg-white/60 p-3 focus-visible:outline-2" /><label className="text-sm font-semibold" htmlFor="channel">Channel</label><select id="channel" name="channel" defaultValue={latest.channel} className="min-h-11 w-full border border-black/20 bg-white/60 px-3"><option value="email">Email</option>{detail.phone && <option value="sms">SMS</option>} {detail.phone && <option value="phone">Phone</option>}</select><button className="min-h-11 bg-black px-5 text-sm font-semibold text-white">Save draft</button></form>}
                  {latest.status === "draft" && <form action={approveOutreach} className="mt-3"><input type="hidden" name="risk_assessment_id" value={riskId} /><input type="hidden" name="outreach_id" value={latest.outreach_id} /><button disabled={!latest.final_message} className="min-h-11 border border-black px-5 text-sm font-semibold disabled:opacity-35">Approve outreach</button></form>}
                  {latest.status === "ready" && <form action={sendOutreach} className="mt-5"><input type="hidden" name="risk_assessment_id" value={riskId} /><input type="hidden" name="outreach_id" value={latest.outreach_id} /><button disabled={detail.do_not_contact} className="min-h-11 bg-[#c72c25] px-5 text-sm font-semibold text-white disabled:opacity-35">Send simulated outreach</button></form>}
                  {latest.status === "sent" && <form action={completeOutreach} className="mt-5 space-y-3"><input type="hidden" name="risk_assessment_id" value={riskId} /><input type="hidden" name="outreach_id" value={latest.outreach_id} /><label className="text-sm font-semibold" htmlFor="response">Member response</label><select id="response" name="response" className="min-h-11 w-full border border-black/20 bg-white/60 px-3"><option value="interested">Interested in returning</option><option value="needs_support">Needs support</option><option value="not_interested">Not interested</option><option value="do_not_contact">Do not contact</option></select><button className="min-h-11 bg-black px-5 text-sm font-semibold text-white">Complete outreach</button></form>}
                  {latest.status === "completed" && <p className="mt-5 text-sm font-semibold">Completed · {latest.response_outcome?.replaceAll("_", " ")}</p>}
                </>
              )}
            </section>

            {detail.review_status !== "resolved" && <section className="glass-panel rounded-3xl p-6"><h2 className="text-xl font-semibold">Dismiss false or non-actionable flag</h2><form action={dismissRiskCase} className="mt-4"><input type="hidden" name="risk_assessment_id" value={riskId} /><label className="text-sm font-semibold" htmlFor="dismiss-reason">Required reason</label><textarea id="dismiss-reason" name="reason" required rows={3} className="mt-2 w-full border border-black/20 bg-white/60 p-3" /><button className="mt-3 min-h-11 border border-[#c72c25] px-5 text-sm font-semibold text-[#a9231e]">Dismiss case</button></form></section>}
          </div>
        </div>
      )}
    </PortalShell>
  );
}
