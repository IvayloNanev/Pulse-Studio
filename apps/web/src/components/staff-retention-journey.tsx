import { getRetentionWorkflowState } from "@/lib/staff-retention-workflow";

type StaffRetentionJourneyProps = {
  reviewStatus: string;
  outreachStatus?: string | null;
  responseOutcome?: string | null;
  resolutionReason?: string | null;
  doNotContact?: boolean;
  canStartOutreach?: boolean;
  blockedReason?: string | null;
};

const stages = [
  { key: "detected", label: "Risk detected", description: "Attendance evidence created this case." },
  { key: "review", label: "Staff review", description: "Confirm the evidence and add factual context." },
  { key: "outreach", label: "Outreach prepared", description: "Review the message and contact channel." },
  { key: "contact", label: "Member contacted", description: "Send outreach and wait for a response." },
  { key: "resolved", label: "Outcome recorded", description: "Resolve, dismiss, or schedule follow-up." },
] as const;

export function StaffRetentionJourney(props: StaffRetentionJourneyProps) {
  const workflow = getRetentionWorkflowState(props);
  const current = workflow.stage;

  return (
    <section aria-labelledby="retention-journey-heading" className="glass-panel rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#a9231e]">Case journey</p>
          <h2 id="retention-journey-heading" className="mt-2 text-2xl font-semibold">Where this review stands</h2>
        </div>
        <p className="rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white">Step {current + 1} of {stages.length}</p>
      </div>

      <ol className="mt-6 grid gap-3 lg:grid-cols-5">
        {stages.map((stage, index) => {
          const complete = index < current;
          const active = index === current;
          return (
            <li key={stage.key} aria-current={active ? "step" : undefined} className={`relative min-w-0 rounded-2xl border p-4 ${active ? "border-black bg-black text-white shadow-lg" : complete ? "border-emerald-700/20 bg-emerald-50" : "border-black/10 bg-white/60"}`}>
              <div className="flex items-center gap-2">
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-[#ff5b52] text-white" : complete ? "bg-emerald-700 text-white" : "bg-black/10 text-black/60"}`}>{complete ? "✓" : index + 1}</span>
                <p className="text-sm font-semibold">{stage.label}</p>
              </div>
              <p className={`mt-3 text-xs leading-5 ${active ? "text-white/75" : "text-black/60"}`}>{stage.description}</p>
              {stage.key === "resolved" && props.responseOutcome ? <p className="mt-2 text-xs font-semibold capitalize">{props.responseOutcome.replaceAll("_", " ")}</p> : null}
            </li>
          );
        })}
      </ol>
      {workflow.explanation ? <p role="status" className={`mt-4 rounded-2xl p-4 text-sm font-medium ${workflow.kind === "blocked" || workflow.kind === "dismissed" ? "bg-amber-100 text-amber-950" : "bg-white/65 text-black/70"}`}>{workflow.label}: {workflow.explanation}</p> : null}
    </section>
  );
}
