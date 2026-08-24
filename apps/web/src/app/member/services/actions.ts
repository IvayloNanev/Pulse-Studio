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
