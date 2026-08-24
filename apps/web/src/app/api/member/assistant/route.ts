import { NextResponse } from "next/server";

import { newYorkDateParts, newYorkMonthWindow } from "@/lib/member-calendar";
import { createClient } from "@/lib/supabase/server";

type MemberActivity = {
  attendance_status: "attended" | "no_show" | null;
  class_type_label: string;
  instructor_name: string;
  starts_at: string;
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: memberId } = await supabase.rpc("current_member_id");
  if (!memberId) return NextResponse.json({ error: "Member access required." }, { status: 403 });
  const now = new Date();
  const current = newYorkDateParts(now);
  const { startsAt, endsAt } = newYorkMonthWindow(current.year, current.month);
  const nowIso = now.toISOString();
  const [{ data: policies, error: policyError }, { data: contextRows, error: contextError }, { data: activityRows, error: activityError }, { data: activityStatsRows, error: activityStatsError }] = await Promise.all([
    supabase.from("product_c_policy_answers").select("policy_key,category,question,answer").order("sort_order", { ascending: true }),
    supabase.rpc("product_c_member_context", { p_from: nowIso, p_as_of: nowIso }),
    supabase.rpc("member_activity", { p_from: startsAt.toISOString(), p_to: endsAt.toISOString() }),
    supabase.rpc("member_activity_stats", { p_month_from: startsAt.toISOString(), p_month_to: endsAt.toISOString() }),
  ]);
  if (policyError) return NextResponse.json({ error: "Approved studio answers are temporarily unavailable." }, { status: 503 });
  const recentActivity = ((activityRows ?? []) as MemberActivity[])
    .filter((activity) => activity.attendance_status === "attended" || activity.attendance_status === "no_show")
    .slice(-5)
    .reverse();
  return NextResponse.json({
    policies: policies ?? [],
    context: {
      ...(contextRows?.[0] ?? {}),
      activity_stats: activityStatsRows?.[0] ?? null,
      recent_activity: recentActivity,
      availability: {
        membership: !contextError,
        activity: !activityError && !activityStatsError,
      },
    },
  });
}
