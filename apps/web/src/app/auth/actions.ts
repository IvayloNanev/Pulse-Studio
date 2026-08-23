"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function signOut(formData: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const audience = formData.get("audience");
  redirect(audience === "staff" ? "/staff/login?signed_out=true" : "/login?signed_out=true");
}
