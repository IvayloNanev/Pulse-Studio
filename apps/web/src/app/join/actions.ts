"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function submitMembershipApplication(formData: FormData) {
  const planId = String(formData.get("plan_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_membership_application", {
    p_first_name: String(formData.get("first_name") ?? ""),
    p_last_name: String(formData.get("last_name") ?? ""),
    p_email: String(formData.get("email") ?? ""),
    p_phone: String(formData.get("phone") ?? ""),
    p_plan_id: planId,
  });
  if (error) redirect(`/join?plan=${encodeURIComponent(planId)}&error=${encodeURIComponent(error.message)}`);
  redirect("/join?success=Application%20received.%20Pulse%20Studio%20staff%20will%20contact%20you%20about%20account%20activation%20and%20payment.");
}

