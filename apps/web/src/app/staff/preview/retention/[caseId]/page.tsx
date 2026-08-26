import Link from "next/link";
import { notFound } from "next/navigation";

import { PortalShell } from "@/components/portal-shell";
import { StaffRetentionPreviewAction } from "@/components/staff-retention-preview-action";
import { StaffMetric, StaffReason, StaffUrgencyBadge } from "@/components/staff-workflow-ui";
import { staffPreviewLinks } from "@/lib/staff-preview-navigation";
import { retentionPreviewCases } from "@/lib/staff-retention-preview-data";

function actionChecklist(status: string) {
  if (status === "Ready for review") return ["Confirm the attendance evidence", "Review existing staff notes", "Decide whether outreach is appropriate", "Start the approved outreach workflow"];
  if (status === "Outreach draft") return ["Review the original message", "Edit only factual member-specific details", "Choose the approved contact channel", "Submit the final message for simulated sending"];
  if (status === "Outreach ready") return ["Confirm the final message", "Confirm the contact channel", "Check contact restrictions", "Simulate sending the approved outreach"];
  if (status === "Outreach sent" || status === "Awaiting response") return ["Review when outreach was sent", "Record a response if one was received", "Do not retry before the 14-day boundary", "Complete the case when an outcome is known"];
  if (status.includes("Follow-up")) return ["Confirm the 14-day boundary", "Review previous attempts", "Prepare the next approved message", "Do not exceed three total attempts"];
  return ["Continue monitoring attendance", "No outreach case is required", "Re-evaluate only from authoritative attendance records"];
}

export default async function StaffRetentionCasePreviewPage({ params }: { params: Promise<{ caseId: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { caseId } = await params;
  const item = retentionPreviewCases.find((candidate) => candidate.id === caseId);
  if (!item) notFound();
  const monitoring = item.priority === "low";

  return (
    <PortalShell audience="staff" eyebrow="Member retention · Case preview" title={item.member} description="Review the complete attendance evidence, risk result, workflow state, and recommended staff action." links={staffPreviewLinks}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Link href="/staff/preview/retention" className="inline-flex min-h-11 items-center rounded-full border border-black/15 bg-white/70 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">← Back to retention graph</Link><span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">Local preview · no live changes</span></div>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <article className="glass-panel rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2"><StaffUrgencyBadge level={item.priority === "high" ? "urgent" : item.priority === "medium" ? "attention" : "ready"}>{monitoring ? "monitoring" : `${item.priority} risk`}</StaffUrgencyBadge><span className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-semibold">{item.status}</span><span className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-semibold">Evaluated {item.evaluatedAt}</span></div>
          <h2 className="mt-5 text-2xl font-semibold">Attendance evidence</h2>
          <div className="mt-4 grid grid-cols-3 gap-2"><StaffMetric value={item.previous} label="Previous visits" /><StaffMetric value={item.current} label="Current visits" /><StaffMetric value={`−${item.decline}%`} label="Decline" emphasis={!monitoring} /></div>
          <div className="mt-5"><StaffReason>Attendance changed from {item.previous} to {item.current} visits across two consecutive 30-day periods. Last attendance was recorded on {item.lastAttended}.</StaffReason></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white/65 p-4"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-black/55">Staff notes</p><p className="mt-2 text-2xl font-semibold">{item.notes}</p><p className="mt-1 text-sm text-black/65">Notes attached to this evaluation</p></div><div className="rounded-2xl bg-white/65 p-4"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-black/55">Current state</p><p className="mt-2 text-lg font-semibold">{item.status}</p><p className="mt-1 text-sm text-black/65">The workflow cannot skip required stages</p></div></div>
        </article>

        <aside className="rounded-3xl bg-[#eee6dc] p-5 sm:p-6">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#a9231e]">What staff should do</p>
          <h2 className="mt-2 text-2xl font-semibold">{monitoring ? "Continue monitoring" : item.nextAction}</h2>
          <ol className="mt-5 space-y-3">{actionChecklist(item.status).map((step, index) => <li key={step} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-2xl bg-white/65 p-3"><span className="flex size-8 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">{index + 1}</span><p className="pt-1 text-sm leading-6">{step}</p></li>)}</ol>
          <div className="mt-5"><StaffRetentionPreviewAction action={item.nextAction} monitoring={monitoring} /></div>
        </aside>
      </section>
    </PortalShell>
  );
}
