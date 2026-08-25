import Link from "next/link";

import { MemberHome } from "@/components/member-home";
import type { MemberDashboardSummary } from "@/components/member-dashboard";
import { MemberStatusMessage } from "@/components/member-status-message";
import { PortalShell } from "@/components/portal-shell";
import { requireMember } from "@/lib/auth";
import { memberLinks } from "@/lib/member-navigation";

export default async function MemberPortalPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string; notifications?: string }> }) {
  const { supabase, memberId } = await requireMember();
  const params = await searchParams;
  const now = new Date().toISOString();
  const [{ data: dashboardData, error: dashboardError }, { data: notificationData, error: notificationError }, { data: membershipHistory }, { data: memberData, error: memberError }] = await Promise.all([
    supabase.rpc("member_dashboard", { p_as_of: now }),
    supabase.from("notifications").select("notification_id,event_type,channel,status,created_at,related_record_type").eq("member_id", memberId).is("read_at", null).order("created_at", { ascending: false }).limit(5),
    supabase.from("memberships").select("start_date").eq("member_id", memberId).order("start_date", { ascending: true }).limit(1),
    supabase.from("members").select("email,phone").eq("member_id", memberId).single(),
  ]);
  const dashboard = dashboardData?.[0] as MemberDashboardSummary | undefined;

  return <PortalShell audience="member" eyebrow="Member portal" title="Home" description="Your Pulse Studio home." links={memberLinks} showHeader={false}>
    <MemberStatusMessage success={params.success} error={params.error} />
    {dashboardError ? <div role="alert" className="rounded-3xl border border-black/15 bg-[#c72c25]/5 p-6 text-sm text-[#8e211c]">Your membership details could not be loaded. Refresh and try again.</div> : dashboard ? <MemberHome summary={dashboard} memberId={memberId} memberSince={membershipHistory?.[0]?.start_date} account={memberError || !memberData ? undefined : memberData} notifications={notificationData ?? []} notificationError={notificationError ? "Your notifications are temporarily unavailable." : undefined} initialNotificationsOpen={params.notifications === "open"} /> : <div className="rounded-3xl border border-black/10 bg-white/60 p-8"><h1 className="text-2xl font-semibold">Membership details are not available</h1><p className="mt-2 max-w-xl text-sm leading-6 text-black/65">Your account is connected, but there is no active or paused membership to display.</p><Link href="/member?assistant=open" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-black px-5 text-sm font-semibold text-white">Ask Pulse for guidance</Link></div>}
  </PortalShell>;
}
