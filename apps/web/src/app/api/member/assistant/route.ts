import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: memberId } = await supabase.rpc("current_member_id");
  if (!memberId) return NextResponse.json({ error: "Member access required." }, { status: 403 });
  const now = new Date().toISOString();
  const [{ data: policies, error: policyError }, { data: contextRows }] = await Promise.all([
    supabase.from("product_c_policy_answers").select("policy_key,category,question,answer").order("sort_order", { ascending: true }),
    supabase.rpc("product_c_member_context", { p_from: now, p_as_of: now }),
  ]);
  if (policyError) return NextResponse.json({ error: "Approved studio answers are temporarily unavailable." }, { status: 503 });
  return NextResponse.json({ policies: policies ?? [], context: contextRows?.[0] ?? null });
}
