"use client";

import { useEffect, useRef, useState } from "react";

import { StaffRetentionJourney } from "@/components/staff-retention-journey";
import { getRetentionWorkflowState, previewRetentionWorkflowInput } from "@/lib/staff-retention-workflow";

type StaffRetentionPreviewJourneyProps = {
  caseId: string;
  initialStatus: string;
  email: string;
  phone: string;
  doNotContact: boolean;
};

const stepContent = [
  { title: "Open the staff review", description: "Acknowledge the attendance signal and begin the required review.", action: "Begin staff review" },
  { title: "Confirm the evidence", description: "Verify that the attendance comparison supports this case before preparing contact.", action: "Confirm evidence" },
  { title: "Approve the outreach plan", description: "Choose the contact channel and confirm that the message is ready.", action: "Approve outreach" },
  { title: "Record member contact", description: "Confirm that the approved outreach was sent through the selected channel.", action: "Record outreach sent" },
  { title: "Record the outcome", description: "Capture the member response and close the journey with an explicit result.", action: "Complete journey" },
] as const;

function journeyState(stage: number, complete: boolean) {
  if (complete) return { review: "resolved", outreach: "completed" };
  if (stage === 4) return { review: "in_progress", outreach: "outcome_pending" };
  if (stage === 3) return { review: "in_review", outreach: "sent" };
  if (stage === 2) return { review: "in_review", outreach: "ready" };
  if (stage === 1) return { review: "in_review", outreach: null };
  return { review: "pending", outreach: null };
}

export function StaffRetentionPreviewJourney({ caseId, initialStatus, email, phone, doNotContact }: StaffRetentionPreviewJourneyProps) {
  const initialInput = previewRetentionWorkflowInput(initialStatus);
  const initialWorkflow = getRetentionWorkflowState(initialInput);
  const initialStage = initialWorkflow.stage;
  const [stage, setStage] = useState(initialStage);
  const [complete, setComplete] = useState(false);
  const [evidenceConfirmed, setEvidenceConfirmed] = useState(false);
  const [channel, setChannel] = useState("email");
  const [outcome, setOutcome] = useState("interested");
  const responsibilityHeading = useRef<HTMLHeadingElement>(null);
  const state = journeyState(stage, complete);
  const content = stepContent[stage];

  useEffect(() => {
    responsibilityHeading.current?.focus();
  }, [stage, complete]);

  if (initialWorkflow.kind === "monitoring") {
    return <div className="space-y-5"><StaffRetentionJourney reviewStatus="monitoring" /><section className="rounded-3xl bg-emerald-50 p-6"><p className="font-mono text-xs uppercase tracking-[0.16em] text-emerald-800">Monitoring only</p><h2 className="mt-2 text-2xl font-semibold">No outreach case is open</h2><p className="mt-3 text-sm leading-6 text-black/65">Continue observing authoritative attendance. This member cannot be advanced through an outreach journey unless a qualifying case is created.</p></section></div>;
  }

  function advance() {
    if (stage === 4) {
      setComplete(true);
      window.localStorage.setItem(`pulse-retention-practice:${caseId}`, JSON.stringify({ outcome, completedAt: new Date().toISOString() }));
    }
    else setStage((current) => Math.min(4, current + 1) as 0 | 1 | 2 | 3 | 4);
  }

  return (
    <div className="space-y-5">
      <p role="note" className="rounded-2xl border border-amber-700/20 bg-amber-50 p-4 text-sm font-medium text-amber-950">Practice workflow only. These controls demonstrate the approved sequence and do not save changes to production records.</p>
      <StaffRetentionJourney reviewStatus={state.review} outreachStatus={state.outreach} responseOutcome={complete ? outcome : null} />

      <section aria-labelledby="complete-step-heading" aria-live="polite" className="grid gap-5 rounded-3xl bg-[#eee6dc] p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.7fr)]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#a9231e]">Current responsibility</p>
          <h2 ref={responsibilityHeading} tabIndex={-1} id="complete-step-heading" className="mt-2 text-2xl font-semibold outline-none">{complete ? "Journey completed" : content.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/65">{complete ? "The member outcome has been recorded and every required stage is complete." : content.description}</p>
          {complete ? <div className="mt-5 rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">Recorded practice outcome</p><p className="mt-2 text-lg font-semibold capitalize">{outcome.replaceAll("_", " ")}</p><p className="mt-1 text-sm text-black/65">Shown for workflow testing only; no production member record was changed.</p></div> : null}
          {!complete && stage === 1 ? <label className="mt-5 flex min-h-11 items-center gap-3 rounded-2xl bg-white/70 px-4 text-sm font-semibold"><input type="checkbox" checked={evidenceConfirmed} onChange={(event) => setEvidenceConfirmed(event.target.checked)} className="size-5 accent-[#c72c25]" />I reviewed the attendance evidence</label> : null}
          {!complete && stage === 2 ? <div className="mt-5 space-y-4"><section aria-labelledby="outreach-contact-heading" className="rounded-2xl bg-white/75 p-4"><h3 id="outreach-contact-heading" className="text-xs font-semibold uppercase tracking-[0.12em] text-black/60">Verify contact destination</h3><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-black/60">Email</dt><dd className="mt-1 break-all font-semibold">{email}</dd></div><div><dt className="text-black/60">Phone</dt><dd className="mt-1 font-semibold">{phone}</dd></div></dl><p className={`mt-3 text-sm font-semibold ${doNotContact ? "text-[#a9231e]" : "text-emerald-800"}`}>{doNotContact ? "Do not contact — outreach cannot be approved." : "Contact permitted"}</p></section><label className="block text-sm font-semibold" htmlFor="preview-channel">Approved channel<select id="preview-channel" value={channel} onChange={(event) => setChannel(event.target.value)} disabled={doNotContact} className="mt-2 min-h-11 w-full rounded-xl border border-black/15 bg-white/75 px-3 disabled:cursor-not-allowed disabled:opacity-50"><option value="email">Email · {email}</option><option value="sms">SMS · {phone}</option><option value="phone">Phone · {phone}</option></select></label></div> : null}
          {!complete && stage === 4 ? <label className="mt-5 block text-sm font-semibold" htmlFor="preview-outcome">Member outcome<select id="preview-outcome" value={outcome} onChange={(event) => setOutcome(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-black/15 bg-white/75 px-3"><option value="interested">Interested in returning</option><option value="needs_support">Needs support</option><option value="not_interested">Not interested</option><option value="do_not_contact">Do not contact</option></select></label> : null}
        </div>

        <div className="flex flex-col justify-end rounded-2xl bg-white/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/60">Progress</p>
          <p className="mt-2 text-3xl font-semibold">{complete ? "5 / 5" : `${stage + 1} / 5`}</p>
          {!complete ? <button type="button" onClick={advance} disabled={(stage === 1 && !evidenceConfirmed) || (stage === 2 && doNotContact)} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#c72c25] px-5 text-sm font-semibold text-white transition hover:bg-[#a9231e] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-45">{content.action}</button> : <button type="button" onClick={() => { window.localStorage.removeItem(`pulse-retention-practice:${caseId}`); setStage(initialStage); setComplete(false); setEvidenceConfirmed(false); }} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-black/15 bg-white px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Restart practice journey</button>}
        </div>
      </section>
    </div>
  );
}
