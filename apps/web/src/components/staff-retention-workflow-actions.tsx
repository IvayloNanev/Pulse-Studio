import { approveOutreach, completeOutreach, createRiskNote, dismissRiskCase, editOutreachDraft, sendOutreach, startRiskReview } from "@/app/staff/actions";
import { RetentionFollowUpControl } from "@/components/retention-follow-up-control";
import { StaffSubmitButton } from "@/components/staff-submit-button";
import { getRetentionWorkflowState } from "@/lib/staff-retention-workflow";

type Outreach = {
  outreach_id: string;
  attempt_number: number;
  channel: "email" | "sms" | "phone";
  original_message: string;
  final_message: string | null;
  status: "draft" | "ready" | "sent" | "completed";
  response_outcome: string | null;
  cooldown_until: string | null;
};

type StaffRetentionWorkflowActionsProps = {
  riskId: string;
  reviewStatus: string;
  phone: string | null;
  doNotContact: boolean;
  resolutionReason?: string | null;
  latest?: Outreach;
  canStartOutreach: boolean;
  blockedReason: string | null;
};

export function StaffRetentionWorkflowActions(props: StaffRetentionWorkflowActionsProps) {
  const latest = props.latest;
  const workflow = getRetentionWorkflowState({ reviewStatus: props.reviewStatus, outreachStatus: latest?.status, responseOutcome: latest?.response_outcome, resolutionReason: props.resolutionReason, doNotContact: props.doNotContact, canStartOutreach: props.canStartOutreach, blockedReason: props.blockedReason });

  if (workflow.kind === "completed" || workflow.kind === "dismissed") {
    const recordedOutcome = latest?.response_outcome?.replaceAll("_", " ") ?? props.resolutionReason?.replace(/^response_/, "").replaceAll("_", " ") ?? (workflow.kind === "dismissed" ? "Case dismissed" : "Case resolved");
    return <section className="rounded-3xl bg-emerald-50 p-6"><p className="font-mono text-xs uppercase tracking-[0.16em] text-emerald-800">Journey complete</p><h2 className="mt-2 text-2xl font-semibold">{workflow.label}</h2>{workflow.explanation ? <p className="mt-3 text-sm leading-6 text-black/65">{workflow.explanation}</p> : null}<div className="mt-5 rounded-2xl bg-white/75 p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/60">Recorded outcome</p><p className="mt-2 text-lg font-semibold capitalize">{recordedOutcome}</p><p className="mt-1 text-sm text-black/65">This result is saved to the authoritative Product D case record.</p></div></section>;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
      <section className="glass-panel rounded-3xl p-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#a9231e]">Complete current step</p>
        <h2 className="mt-2 text-2xl font-semibold">{workflow.nextAction}</h2>
        {workflow.explanation ? <p className="mt-3 rounded-2xl bg-amber-100 p-4 text-sm font-medium text-amber-950">{workflow.explanation}</p> : null}

        {props.reviewStatus !== "pending" && props.reviewStatus !== "resolved" ? <form action={createRiskNote} className="mt-5 rounded-2xl border border-black/10 bg-white/60 p-4"><input type="hidden" name="risk_assessment_id" value={props.riskId} /><label className="text-sm font-semibold" htmlFor="journey-note">Add factual review context</label><textarea id="journey-note" name="body" required rows={3} className="mt-2 w-full rounded-xl border border-black/20 bg-white/75 p-3 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2" /><StaffSubmitButton pendingLabel="Adding note…" className="mt-3" tone="secondary">Add note</StaffSubmitButton></form> : null}

        {props.reviewStatus === "pending" ? <form action={startRiskReview} className="mt-5"><input type="hidden" name="risk_assessment_id" value={props.riskId} /><StaffSubmitButton pendingLabel="Starting review…">Start review</StaffSubmitButton></form> : null}

        {!latest && props.reviewStatus !== "pending" && !props.doNotContact ? <p className="mt-4 text-sm text-black/65">The review is active, but no outreach draft is available yet. Add factual context on the member-review page or refresh after the draft is created.</p> : null}

        {latest?.status === "draft" && !props.doNotContact ? <form action={editOutreachDraft} className="mt-5 space-y-3"><input type="hidden" name="risk_assessment_id" value={props.riskId} /><input type="hidden" name="outreach_id" value={latest.outreach_id} /><label className="text-sm font-semibold" htmlFor="journey-final-message">Staff-reviewed message</label><textarea id="journey-final-message" name="final_message" required defaultValue={latest.final_message ?? latest.original_message} rows={7} className="w-full rounded-xl border border-black/20 bg-white/60 p-3 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2" /><label className="text-sm font-semibold" htmlFor="journey-channel">Channel</label><select id="journey-channel" name="channel" defaultValue={latest.channel} className="min-h-11 w-full rounded-xl border border-black/20 bg-white/60 px-3 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2"><option value="email">Email</option>{props.phone ? <option value="sms">SMS</option> : null}{props.phone ? <option value="phone">Phone</option> : null}</select><StaffSubmitButton pendingLabel="Saving draft…">Save reviewed draft</StaffSubmitButton></form> : null}

        {latest?.status === "draft" && !props.doNotContact ? <form action={approveOutreach} className="mt-3"><input type="hidden" name="risk_assessment_id" value={props.riskId} /><input type="hidden" name="outreach_id" value={latest.outreach_id} /><StaffSubmitButton pendingLabel="Approving…" disabled={!latest.final_message} tone="secondary">Approve saved outreach</StaffSubmitButton>{!latest.final_message ? <p className="mt-2 text-xs text-black/60">Save the reviewed message before approval.</p> : null}</form> : null}

        {latest?.status === "ready" && !props.doNotContact ? <form action={sendOutreach} className="mt-5"><input type="hidden" name="risk_assessment_id" value={props.riskId} /><input type="hidden" name="outreach_id" value={latest.outreach_id} /><StaffSubmitButton pendingLabel="Sending…">Send simulated outreach</StaffSubmitButton></form> : null}

        {latest?.status === "sent" ? <><form action={completeOutreach} className="mt-5 space-y-3"><input type="hidden" name="risk_assessment_id" value={props.riskId} /><input type="hidden" name="outreach_id" value={latest.outreach_id} /><label className="text-sm font-semibold" htmlFor="journey-response">Member response</label><select id="journey-response" name="response" className="min-h-11 w-full rounded-xl border border-black/20 bg-white/60 px-3 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2"><option value="interested">Interested in returning</option><option value="needs_support">Needs support</option><option value="not_interested">Not interested</option><option value="do_not_contact">Do not contact</option></select><StaffSubmitButton pendingLabel="Completing…">Record response and resolve</StaffSubmitButton></form><RetentionFollowUpControl riskId={props.riskId} attemptNumber={latest.attempt_number} cooldownUntil={latest.cooldown_until} canStartOutreach={props.canStartOutreach} blockedReason={props.blockedReason} /></> : null}
      </section>

      {props.reviewStatus !== "resolved" ? <section className="rounded-3xl bg-[#eee6dc] p-6"><p className="font-mono text-xs uppercase tracking-[0.16em] text-[#a9231e]">Alternative resolution</p><h2 className="mt-2 text-xl font-semibold">Dismiss a false or non-actionable flag</h2><p className="mt-2 text-sm leading-6 text-black/65">Use this only when the attendance evidence should not lead to outreach. A reason is required.</p><form action={dismissRiskCase} className="mt-4"><input type="hidden" name="risk_assessment_id" value={props.riskId} /><label className="text-sm font-semibold" htmlFor="journey-dismiss-reason">Reason</label><textarea id="journey-dismiss-reason" name="reason" required rows={4} className="mt-2 w-full rounded-xl border border-black/20 bg-white/70 p-3 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2" /><StaffSubmitButton pendingLabel="Dismissing…" tone="danger" className="mt-3">Dismiss case</StaffSubmitButton></form></section> : null}
    </div>
  );
}
