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
    p_cardholder_name: String(formData.get("cardholder_name") ?? ""),
    p_card_brand: String(formData.get("card_brand") ?? ""),
    p_card_number: String(formData.get("card_number") ?? ""),
    p_expiration_month: Number(formData.get("expiration_month") ?? 0),
    p_expiration_year: Number(formData.get("expiration_year") ?? 0),
    p_security_code: String(formData.get("security_code") ?? ""),
    p_billing_zip: String(formData.get("billing_zip") ?? ""),
  });
  if (error) redirect(`/join?plan=${encodeURIComponent(planId)}&error=${encodeURIComponent(error.message)}`);
  redirect("/join?success=Application%20and%20simulated%20payment%20method%20received.%20Pulse%20Studio%20staff%20will%20review%20your%20account%20activation.");
}
