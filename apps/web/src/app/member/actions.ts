"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireMember } from "@/lib/auth";

function destination(path: string, type: "success" | "error", message: string) {
  return `${path}?${type}=${encodeURIComponent(message)}`;
}

export async function bookClass(formData: FormData) {
  const classSessionId = String(formData.get("class_session_id") ?? "");
  const useDropIn = formData.get("use_drop_in") === "true";

  if (!classSessionId) redirect(destination("/member/classes", "error", "Choose a class to reserve."));

  const { supabase } = await requireMember();
  const { data, error } = await supabase.rpc("book_class_session", {
    p_class_session_id: classSessionId,
    p_use_drop_in: useDropIn,
  });

  if (error) redirect(destination("/member/classes", "error", error.message));

  const status = data?.[0]?.reservation_status;
  const message = status === "waitlisted"
    ? "You joined the waitlist. We will notify you if a spot opens."
    : useDropIn
      ? "Class confirmed with the simulated $35 drop-in."
      : "Class confirmed. One membership credit is reserved.";

  revalidatePath("/member");
  revalidatePath("/member/classes");
  revalidatePath("/member/reservations");
  redirect(destination("/member/reservations", "success", message));
}

export async function cancelReservation(formData: FormData) {
  const reservationId = String(formData.get("reservation_id") ?? "");
  if (!reservationId) redirect(destination("/member/reservations", "error", "Reservation not found."));

  const { supabase } = await requireMember();
  const { data, error } = await supabase.rpc("cancel_member_reservation", {
    p_reservation_id: reservationId,
  });

  if (error) redirect(destination("/member/reservations", "error", error.message));

  const result = data?.[0];
  const message = result?.is_late_cancellation
    ? "Reservation cancelled. Because it was within 12 hours, the credit was not returned."
    : "Reservation cancelled and the credit or drop-in authorization was returned.";

  revalidatePath("/member");
  revalidatePath("/member/classes");
  revalidatePath("/member/reservations");
  redirect(destination("/member/reservations", "success", message));
}

