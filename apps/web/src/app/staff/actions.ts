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

function retentionQueueDestination(type: "success" | "error", message: string) {
  return `/staff/retention?${type}=${encodeURIComponent(message)}`;
}

type EvaluateMemberRiskRow = {
  assessment_created: boolean;
  risk_assessment_id: string | null;
  previous_visits: number | null;
  current_visits: number | null;
  decline_percentage: number | null;
  risk_level: string | null;
  initial_outreach_id: string | null;
  evaluation_result: string;
};

const EVALUATION_RESULT_MESSAGES: Record<string, (row: EvaluateMemberRiskRow) => string> = {
  qualifying_assessment_created: (row) =>
    `New ${row.risk_level} risk case created (${row.previous_visits} \u2192 ${row.current_visits} visits, ${row.decline_percentage}% decline). Initial outreach draft prepared.`,
  already_evaluated: () => "This member already has an evaluation recorded at this exact time.",
  open_episode_exists: () => "This member already has an open, unresolved risk case. Resolve or dismiss it before evaluating again.",
  no_recovery_since_previous_episode: () =>
    "This member has not attended a class since their last risk case was resolved, so a new episode cannot start yet.",
  insufficient_membership_history: () =>
    "This member does not yet have 60 days of membership history, so they cannot be evaluated.",
  insufficient_previous_visits: (row) =>
    `This member had only ${row.previous_visits ?? 0} visit(s) in the previous 30-day period (4 required), so no evaluation is possible yet.`,
  decline_below_threshold: (row) =>
    `Attendance went from ${row.previous_visits} to ${row.current_visits} visits, a ${row.decline_percentage}% change \u2014 below the 50% threshold, so no case was created.`,
};

export async function evaluateMemberRisk(formData: FormData) {
  const memberId = String(formData.get("member_id") ?? "").trim();
  if (!memberId) redirect(retentionQueueDestination("error", "Enter a member ID to evaluate."));

  const { supabase } = await requireStaff();
  const { data, error } = await supabase.rpc("evaluate_member_risk", { p_member_id: memberId });
  if (error) redirect(retentionQueueDestination("error", error.message));

  const row = (Array.isArray(data) ? data[0] : data) as EvaluateMemberRiskRow | undefined;
  if (!row) redirect(retentionQueueDestination("error", "No evaluation result was returned."));

  const describe = EVALUATION_RESULT_MESSAGES[row.evaluation_result] ?? (() => "Evaluation completed.");
  const message = describe(row);

  revalidatePath("/staff/retention");

  if (row.assessment_created && row.risk_assessment_id) {
    revalidatePath(`/staff/retention/${row.risk_assessment_id}`);
    redirect(`/staff/retention/${encodeURIComponent(row.risk_assessment_id)}?success=${encodeURIComponent(message)}`);
  }

  redirect(retentionQueueDestination("success", message));
}

async function runRiskCommand(
  riskId: string,
  command: string,
  args: Record<string, string>,
  success: string,
) {
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc(command, args);
  if (error) redirect(riskDestination(riskId, "error", error.message));
  revalidatePath("/staff/retention");
  revalidatePath(`/staff/retention/${riskId}`);
  redirect(riskDestination(riskId, "success", success));
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
  return runRiskCommand(riskId, "complete_outreach", { p_outreach_id: outreachId, p_response: response }, "Outreach completed and risk case resolved.");
}

export async function dismissRiskCase(formData: FormData) {
  const riskId = String(formData.get("risk_assessment_id") ?? "");
  const reason = String(formData.get("reason") ?? "");
  return runRiskCommand(riskId, "dismiss_risk_case", { p_risk_assessment_id: riskId, p_reason: reason }, "Risk case dismissed with a recorded reason.");
}
