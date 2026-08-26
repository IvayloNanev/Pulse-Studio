"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function confirmRecovery(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const requestedAudience = formData.get("audience") === "staff" ? "staff" : "member";

  if (!tokenHash) {
    redirect(`/auth/update-password?audience=${requestedAudience}&error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });

  if (error) {
    redirect(`/auth/update-password?audience=${requestedAudience}&error=invalid_or_expired`);
  }

  const { data: staffId } = await supabase.rpc("current_staff_id");
  const audience = staffId ? "staff" : requestedAudience;
  redirect(`/auth/update-password?audience=${audience}`);
}
