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
