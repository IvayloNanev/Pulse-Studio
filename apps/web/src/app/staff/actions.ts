"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth";

function rosterDestination(sessionId: string, type: "success" | "error", message: string) {
  return `/staff/rosters/${encodeURIComponent(sessionId)}?${type}=${encodeURIComponent(message)}`;
}

function riskDestination(riskId: string, type: "success" | "error", message: string) {
  return `/staff/retention/${encodeURIComponent(riskId)}?${type}=${encodeURIComponent(message)}`;
}

function riskJourneyDestination(riskId: string, type: "success" | "error", message: string) {
  return `/staff/retention/${encodeURIComponent(riskId)}/journey?${type}=${encodeURIComponent(message)}`;
}

function retentionDestination(type: "success" | "error", message: string) {
  return `/staff/retention?${type}=${encodeURIComponent(message)}`;
}

type RiskEvaluation = {
  assessment_created: boolean;
  risk_assessment_id: string | null;
  previous_visits: number | null;
  current_visits: number | null;
  decline_percentage: number | null;
  risk_level: string | null;
  evaluation_result: string;
};

function evaluationMessage(result: RiskEvaluation) {
  switch (result.evaluation_result) {
    case "qualifying_assessment_created":
      return `New ${result.risk_level ?? "qualifying"} priority case created from ${result.previous_visits ?? 0} previous and ${result.current_visits ?? 0} current visits.`;
    case "already_evaluated":
      return "This member already has an evaluation for this evaluation time.";
    case "open_episode_exists":
      return "This member already has an open case. Complete or dismiss it before starting another evaluation.";
    case "no_recovery_since_previous_episode":
      return "No new case was created because the member has not attended since the previous case was resolved.";
    case "insufficient_membership_history":
      return "No case was created because the member has less than 60 days of membership history.";
    case "insufficient_previous_visits":
      return `No case was created because the previous period has ${result.previous_visits ?? 0} attended classes; at least 4 are required.`;
    case "decline_below_threshold":
      return `No case was created. Attendance changed from ${result.previous_visits ?? 0} to ${result.current_visits ?? 0}, below the 50% decline threshold.`;
    default:
      return "The risk evaluation completed without creating a new case.";
  }
}

export async function evaluateMemberRisk(formData: FormData) {
  const memberId = String(formData.get("member_id") ?? "").trim();
  if (!memberId) redirect(retentionDestination("error", "Choose a member to evaluate."));

  const { supabase } = await requireStaff();
  const { data, error } = await supabase.rpc("evaluate_member_risk", { p_member_id: memberId });
  if (error) {
    console.error("Product D risk evaluation failed", { memberId, code: error.code });
    redirect(retentionDestination("error", "The evaluation could not be completed. Refresh and try again."));
  }

  const result = (Array.isArray(data) ? data[0] : data) as RiskEvaluation | undefined;
  if (!result) redirect(retentionDestination("error", "The evaluation returned no result. Refresh and try again."));

  const message = evaluationMessage(result);
  revalidatePath("/staff/retention");

  if (result.assessment_created && result.risk_assessment_id) {
    revalidatePath(`/staff/retention/${result.risk_assessment_id}`);
    redirect(riskDestination(result.risk_assessment_id, "success", message));
  }

  redirect(retentionDestination("success", message));
}

async function runRiskCommand(
  riskId: string,
  command: string,
  args: Record<string, string>,
  success: string,
  destination: "journey" | "retention" = "journey",
) {
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc(command, args);
  if (error) {
    console.error("Product D case command failed", { riskId, command, code: error.code });
    redirect(riskJourneyDestination(riskId, "error", "The case update could not be completed. Refresh and verify that the action is still eligible."));
  }
  revalidatePath("/staff/retention");
  revalidatePath(`/staff/retention/${riskId}`);
  revalidatePath(`/staff/retention/${riskId}/journey`);
  redirect(destination === "retention" ? retentionDestination("success", success) : riskJourneyDestination(riskId, "success", success));
}

export async function recordAttendance(formData: FormData) {
  const sessionId = String(formData.get("class_session_id") ?? "");
  const reservationId = String(formData.get("reservation_id") ?? "");
  const status = String(formData.get("attendance_status") ?? "");

  if (!sessionId || !reservationId || !["attended", "no_show"].includes(status)) {
    redirect(rosterDestination(sessionId || "unknown", "error", "Attendance request is incomplete."));
  }

  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("record_attendance", {
    p_reservation_id: reservationId,
    p_attendance_status: status,
  });

  if (error) redirect(rosterDestination(sessionId, "error", error.message));

  revalidatePath("/staff");
  revalidatePath("/staff/rosters");
  revalidatePath(`/staff/rosters/${sessionId}`);
  redirect(rosterDestination(sessionId, "success", status === "attended" ? "Member marked attended." : "Member marked no-show."));
}

export async function startRiskReview(formData: FormData) {
  const riskId = String(formData.get("risk_assessment_id") ?? "");
  return runRiskCommand(riskId, "start_risk_review", { p_risk_assessment_id: riskId }, "Review started.");
}

export async function createRiskNote(formData: FormData) {
  const riskId = String(formData.get("risk_assessment_id") ?? "");
  const body = String(formData.get("body") ?? "");
  return runRiskCommand(riskId, "create_risk_note", { p_risk_assessment_id: riskId, p_body: body }, "Note added.");
}

export async function editOutreachDraft(formData: FormData) {
  const riskId = String(formData.get("risk_assessment_id") ?? "");
  const outreachId = String(formData.get("outreach_id") ?? "");
  const message = String(formData.get("final_message") ?? "");
  const channel = String(formData.get("channel") ?? "email");
  return runRiskCommand(riskId, "edit_outreach_draft", { p_outreach_id: outreachId, p_final_message: message, p_channel: channel }, "Draft updated.");
}

export async function approveOutreach(formData: FormData) {
  const riskId = String(formData.get("risk_assessment_id") ?? "");
  const outreachId = String(formData.get("outreach_id") ?? "");
  return runRiskCommand(riskId, "approve_outreach", { p_outreach_id: outreachId }, "Outreach approved and ready to send.");
}

export async function sendOutreach(formData: FormData) {
  const riskId = String(formData.get("risk_assessment_id") ?? "");
  const outreachId = String(formData.get("outreach_id") ?? "");
  return runRiskCommand(riskId, "send_outreach", { p_outreach_id: outreachId }, "Simulated outreach sent once.");
}

export async function completeOutreach(formData: FormData) {
  const riskId = String(formData.get("risk_assessment_id") ?? "");
  const outreachId = String(formData.get("outreach_id") ?? "");
  const response = String(formData.get("response") ?? "needs_support");
  return runRiskCommand(riskId, "complete_outreach", { p_outreach_id: outreachId, p_response: response }, "Outreach completed and risk case resolved.", "retention");
}

export async function createOutreachRetry(formData: FormData) {
  const riskId = String(formData.get("risk_assessment_id") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  if (!riskId || !message) redirect(riskJourneyDestination(riskId || "unknown", "error", "A message is required for the next outreach attempt."));
  return runRiskCommand(riskId, "create_outreach_retry", { p_risk_assessment_id: riskId, p_message: message }, "The next outreach attempt is ready for staff review.");
}

export async function resolveNoResponse(formData: FormData) {
  const riskId = String(formData.get("risk_assessment_id") ?? "");
  if (!riskId) redirect(retentionDestination("error", "The retention case is missing."));
  return runRiskCommand(riskId, "resolve_no_response", { p_risk_assessment_id: riskId }, "Case resolved after three unanswered outreach attempts.", "retention");
}

export async function dismissRiskCase(formData: FormData) {
  const riskId = String(formData.get("risk_assessment_id") ?? "");
  const reason = String(formData.get("reason") ?? "");
  return runRiskCommand(riskId, "dismiss_risk_case", { p_risk_assessment_id: riskId, p_reason: reason }, "Risk case dismissed with a recorded reason.", "retention");
}
