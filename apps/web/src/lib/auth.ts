import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function requireMember() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: memberId, error } = await supabase.rpc("current_member_id");
  if (error || !memberId) redirect("/login?error=member-access-required");

  return { supabase, user, memberId: memberId as string };
}

export async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/staff/login");

  const { data: staffId, error } = await supabase.rpc("current_staff_id");
  if (error || !staffId) redirect("/staff/login?error=staff-access-required");

  return { supabase, user, staffId: staffId as string };
}
