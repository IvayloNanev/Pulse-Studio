export type RetentionWorkflowInput = {
  reviewStatus: string;
  outreachStatus?: string | null;
  responseOutcome?: string | null;
  resolutionReason?: string | null;
  doNotContact?: boolean;
  canStartOutreach?: boolean;
  blockedReason?: string | null;
};

export type RetentionWorkflowState = {
  stage: 0 | 1 | 2 | 3 | 4;
  kind: "active" | "completed" | "dismissed" | "monitoring" | "blocked";
  label: string;
  nextAction: string;
  explanation: string | null;
};

export function getRetentionWorkflowState(input: RetentionWorkflowInput): RetentionWorkflowState {
  const resolution = input.resolutionReason?.toLowerCase() ?? "";
  if (input.reviewStatus === "dismissed" || (input.reviewStatus === "resolved" && resolution.includes("dismiss"))) {
    return { stage: 4, kind: "dismissed", label: "Case dismissed", nextAction: "Return to retention queue", explanation: input.resolutionReason ?? "The attendance signal was reviewed and dismissed without outreach." };
  }
  if (input.reviewStatus === "resolved" || input.outreachStatus === "completed") {
    return { stage: 4, kind: "completed", label: "Outcome recorded", nextAction: "Return to retention queue", explanation: input.responseOutcome?.replaceAll("_", " ") ?? input.resolutionReason ?? null };
  }
  if (input.doNotContact) {
    return { stage: 1, kind: "blocked", label: "Contact restricted", nextAction: "Dismiss or resolve without outreach", explanation: "This member is marked do not contact. Outreach cannot be prepared or sent." };
  }
  if (input.outreachStatus === "outcome_pending") {
    return { stage: 4, kind: "active", label: "Outcome required", nextAction: "Record member outcome", explanation: input.blockedReason ?? null };
  }
  if (input.outreachStatus === "sent") {
    return { stage: 3, kind: input.canStartOutreach === false ? "blocked" : "active", label: "Awaiting outcome", nextAction: input.canStartOutreach ? "Prepare eligible follow-up" : "Record response", explanation: input.blockedReason ?? null };
  }
  if (input.outreachStatus === "draft" || input.outreachStatus === "ready") {
    return { stage: 2, kind: "active", label: input.outreachStatus === "ready" ? "Outreach ready" : "Outreach draft", nextAction: input.outreachStatus === "ready" ? "Send outreach" : "Review and approve outreach", explanation: input.blockedReason ?? null };
  }
  if (input.reviewStatus === "in_progress" || input.reviewStatus === "reviewed") {
    return { stage: 1, kind: "active", label: "Review in progress", nextAction: "Confirm evidence and prepare outreach", explanation: input.blockedReason ?? null };
  }
  if (input.reviewStatus === "monitoring") {
    return { stage: 0, kind: "monitoring", label: "Monitoring only", nextAction: "Continue monitoring", explanation: "No outreach case is open." };
  }
  return { stage: 0, kind: "active", label: "Ready for review", nextAction: "Start review", explanation: input.blockedReason ?? null };
}

export function previewRetentionWorkflowInput(status: string): RetentionWorkflowInput {
  if (status.includes("Monitoring")) return { reviewStatus: "monitoring" };
  if (status === "Outreach draft") return { reviewStatus: "in_progress", outreachStatus: "draft" };
  if (status === "Outreach ready") return { reviewStatus: "in_progress", outreachStatus: "ready" };
  if (status === "Outreach sent" || status === "Awaiting response") return { reviewStatus: "in_progress", outreachStatus: "sent", canStartOutreach: false, blockedReason: "Awaiting a member response or the eligible follow-up date." };
  if (status === "Follow-up scheduled") return { reviewStatus: "in_progress", outreachStatus: "sent", canStartOutreach: false, blockedReason: "The follow-up is scheduled but is not eligible yet." };
  if (status === "Follow-up due") return { reviewStatus: "in_progress", outreachStatus: "sent", canStartOutreach: true };
  return { reviewStatus: "pending" };
}
