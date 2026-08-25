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
  redirect("/join?success=Application%20accepted%20automatically.%20Your%20simulated%20payment%20method%20is%20ready%2C%20no%20real%20charge%20was%20processed%2C%20and%20secure%20account%20setup%20is%20still%20required%20before%20sign-in.");
}
