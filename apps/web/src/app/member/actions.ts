"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireMember } from "@/lib/auth";

function destination(path: string, type: "success" | "error", message: string) {
  const url = new URL(path, "https://pulse.local");
  url.searchParams.set(type, message);
  return `${url.pathname}?${url.searchParams.toString()}${url.hash}`;
}

function returnPath(formData: FormData, fallback: string) {
  const requested = String(formData.get("return_to") ?? "");
  try {
    const url = new URL(requested, "https://pulse.local");
    if (!["/member", "/member/classes", "/member/reservations"].includes(url.pathname)) return fallback;
    const safe = new URLSearchParams();
    const month = url.searchParams.get("month");
    const day = url.searchParams.get("day");
    const classType = url.searchParams.get("class");
    const instructor = url.searchParams.get("instructor");
    if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) safe.set("month", month);
    if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) safe.set("day", day);
    if (classType && ["yoga", "cycling", "hiit"].includes(classType)) safe.set("class", classType);
    if (instructor && instructor.length <= 80) safe.set("instructor", instructor);
    const query = safe.toString();
    const hash = url.hash === "#month-details" ? url.hash : "";
    return `${url.pathname}${query ? `?${query}` : ""}${hash}`;
  } catch {
    return fallback;
  }
}

function safeBookingError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("already has an open reservation")) return "You already have a reservation or waitlist place for this class.";
  if (normalized.includes("already started")) return "This class has already started and can no longer be reserved.";
  if (normalized.includes("active now and at class time")) return "Your membership must be active now and on the class date.";
  if (normalized.includes("no membership credits remaining")) return "No membership credits remain. Choose the $35 drop-in option.";
  if (normalized.includes("class session not found")) return "This class is no longer available.";
  return "We could not complete this reservation. Refresh the schedule and try again.";
}

function safeCancellationError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("reservation not found")) return "This reservation could not be found or is no longer open.";
  if (normalized.includes("only an open reservation")) return "This reservation has already been closed.";
  if (normalized.includes("after class starts")) return "A reservation cannot be cancelled after the class starts.";
  return "We could not cancel this reservation. Refresh and try again.";
}

export async function bookClass(formData: FormData) {
  const classSessionId = String(formData.get("class_session_id") ?? "");
  const useDropIn = formData.get("use_drop_in") === "true";
  const nextPath = returnPath(formData, "/member/classes");

  if (!classSessionId) redirect(destination(nextPath, "error", "Choose a class to reserve."));

  const { supabase } = await requireMember();
  const { data, error } = await supabase.rpc("book_class_session", {
    p_class_session_id: classSessionId,
    p_use_drop_in: useDropIn,
  });

  if (error) {
    console.error("book_class_session failed", { code: error.code, message: error.message });
    redirect(destination(nextPath, "error", safeBookingError(error.message)));
  }

  const status = data?.[0]?.reservation_status;
  const message = status === "waitlisted"
    ? "You joined the waitlist. We will notify you if a spot opens."
    : useDropIn
      ? "Class confirmed with the $35 drop-in."
      : "Class confirmed. One membership credit is reserved.";

  revalidatePath("/member");
  revalidatePath("/member/classes");
  revalidatePath("/member/reservations");
  redirect(destination(nextPath, "success", message));
}

export async function cancelReservation(formData: FormData) {
  const reservationId = String(formData.get("reservation_id") ?? "");
  const nextPath = returnPath(formData, "/member/reservations");
  if (!reservationId) redirect(destination(nextPath, "error", "Reservation not found."));

  const { supabase } = await requireMember();
  const { data, error } = await supabase.rpc("cancel_member_reservation", {
    p_reservation_id: reservationId,
  });

  if (error) {
    console.error("cancel_member_reservation failed", { code: error.code, message: error.message });
    redirect(destination(nextPath, "error", safeCancellationError(error.message)));
  }

  const result = data?.[0];
  const message = result?.is_late_cancellation
    ? "Reservation cancelled. Because it was within 12 hours, any applicable credit or drop-in payment was not returned."
    : "Reservation cancelled. Any applicable credit or drop-in payment was returned; waitlist entries use neither.";

  revalidatePath("/member");
  revalidatePath("/member/classes");
  revalidatePath("/member/reservations");
  redirect(destination(nextPath, "success", message));
}
