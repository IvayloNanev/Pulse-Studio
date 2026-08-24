"use server";

import { redirect } from "next/navigation";

import { requireMember } from "@/lib/auth";

function memberPauseError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("30 days advance notice")) return "Choose a start date at least 30 days from today.";
  if (normalized.includes("between 30 and 90 days")) return "Choose a pause lasting between 30 and 90 days.";
  if (normalized.includes("already has a pending")) return "You already have a pause request awaiting staff review.";
  if (normalized.includes("one approved pause")) return "Only one approved pause is allowed during a rolling 12-month period.";
  if (normalized.includes("must be active")) return "Only an active membership can request a new pause.";
  if (normalized.includes("fit inside an active membership")) return "Those dates do not fit within your active membership period.";
  return "Your pause request could not be submitted. Review the dates and try again.";
}

export async function requestMembershipPause(formData: FormData) {
  const membershipId = String(formData.get("membership_id") ?? "");
  const startsOn = String(formData.get("starts_on") ?? "");
  const endsOn = String(formData.get("ends_on") ?? "");

  if (!membershipId || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) {
    redirect("/member/services?error=Choose%20a%20valid%20start%20and%20end%20date.");
  }

  const { supabase } = await requireMember();
  const { error } = await supabase.rpc("request_membership_pause", {
    p_membership_id: membershipId,
    p_starts_at: `${startsOn}T12:00:00Z`,
    p_ends_at: `${endsOn}T12:00:00Z`,
  });

  if (error) {
    console.error("[member/services] pause request rejected", { message: error.message, membershipId });
    redirect(`/member/services?error=${encodeURIComponent(memberPauseError(error.message))}`);
  }

  redirect("/member/services?success=Pause%20request%20submitted%20for%20staff%20review.");
}

const programLabels: Record<string, string> = {
  friend_referral: "Friend referral",
  mission_guide: "Mission Guide enrollment",
  guest_pass: "Guest-pass request",
  wellness_orientation: "Wellness orientation",
};

export async function requestMemberProgram(formData: FormData) {
  const programKey = String(formData.get("program_key") ?? "");
  const guestName = String(formData.get("guest_name") ?? "").trim();
  const guestEmail = String(formData.get("guest_email") ?? "").trim();
  if (!Object.hasOwn(programLabels, programKey)) redirect("/member/services?error=Choose%20a%20valid%20member%20program.");

  const needsGuest = programKey === "friend_referral" || programKey === "guest_pass";
  if (needsGuest && (!guestName || guestName.length > 100 || guestEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail))) {
    redirect("/member/services?error=Enter%20the%20guest%27s%20name%20and%20a%20valid%20email%20address.");
  }

  const { supabase } = await requireMember();
  const { error } = await supabase.rpc("request_member_program", {
    p_program_key: programKey,
    p_guest_name: needsGuest ? guestName : null,
    p_guest_email: needsGuest ? guestEmail : null,
  });

  if (error) {
    console.error("[member/services] program request rejected", { message: error.message, programKey });
    const message = error.message.toLowerCase().includes("already open")
      ? "You already have an open request for this program."
      : "The program request could not be submitted. Review the information and try again.";
    redirect(`/member/services?error=${encodeURIComponent(message)}`);
  }

  redirect(`/member/services?success=${encodeURIComponent(`${programLabels[programKey]} submitted.`)}`);
}

export async function cancelMemberProgramRequest(formData: FormData) {
  const requestId = String(formData.get("program_request_id") ?? "");
  if (!requestId) redirect("/member/services?error=Program%20request%20not%20found.");
  const { supabase } = await requireMember();
  const { error } = await supabase.rpc("cancel_member_program_request", { p_program_request_id: requestId });
  if (error) {
    console.error("[member/services] program cancellation rejected", { message: error.message, requestId });
    redirect("/member/services?error=This%20program%20request%20could%20not%20be%20cancelled.");
  }
  redirect("/member/services?success=Program%20request%20cancelled.");
}
