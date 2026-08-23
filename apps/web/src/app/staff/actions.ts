"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireStaff } from "@/lib/auth";

function rosterDestination(sessionId: string, type: "success" | "error", message: string) {
  return `/staff/rosters/${encodeURIComponent(sessionId)}?${type}=${encodeURIComponent(message)}`;
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

