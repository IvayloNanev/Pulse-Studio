import Link from "next/link";
import { notFound } from "next/navigation";

import { MemberStatusMessage } from "@/components/member-status-message";
import { PortalShell } from "@/components/portal-shell";
import { StaffRetentionJourney } from "@/components/staff-retention-journey";
import { StaffRetentionWorkflowActions } from "@/components/staff-retention-workflow-actions";
import { requireStaff } from "@/lib/auth";
import { staffLinks } from "@/lib/staff-navigation";

type JourneyDetail = {
  member_name: string;
  email: string;
  risk_reason: string;
  risk_level: string;
  review_status: string;
  evaluated_at: string;
  decline_percentage: number;
  phone: string | null;
  preferred_channel: string;
  previous_visits: number;
  current_visits: number;
  do_not_contact: boolean;
  resolution_reason: string | null;
  outreach_attempts: Array<{ outreach_id: string; attempt_number: number; channel: "email" | "sms" | "phone"; original_message: string; final_message: string | null; status: "draft" | "ready" | "sent" | "completed"; response_outcome: string | null; cooldown_until: string | null }>;
};

type QueueState = { can_start_outreach: boolean; outreach_blocked_reason: string | null };

const dateFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });

export default async function StaffRetentionJourneyPage({ params, searchParams }: { params: Promise<{ riskId: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const { riskId } = await params;
  const messages = await searchParams;
  const { supabase } = await requireStaff();
  const [{ data, error }, { data: queueData }] = await Promise.all([
    supabase.from("product_d_member_detail").select("member_name,email,risk_reason,risk_level,review_status,evaluated_at,decline_percentage,phone,preferred_channel,previous_visits,current_visits,do_not_contact,resolution_reason,outreach_attempts").eq("risk_assessment_id", riskId).maybeSingle(),
    supabase.from("product_d_risk_queue").select("can_start_outreach,outreach_blocked_reason").eq("risk_assessment_id", riskId).maybeSingle(),
  ]);
  if (!data && !error) notFound();
  const detail = data as JourneyDetail | null;
  const queueState = queueData as QueueState | null;
  const latest = detail?.outreach_attempts.at(-1);

  return (
    <PortalShell audience="staff" eyebrow="Staff portal · Product D" title={detail ? `${detail.member_name}'s journey` : "Case journey"} description={detail?.risk_reason ?? "Follow this retention case from detection through resolution."} links={staffLinks}>
      <MemberStatusMessage success={messages.success} error={messages.error} />
      {error ? <div role="alert" className="rounded-2xl bg-white/70 p-5 text-sm text-[#a9231e]">The case journey could not be loaded.</div> : detail ? <div className="space-y-5"><section aria-labelledby="journey-member-heading" className="rounded-3xl bg-white/70 p-5 sm:p-6"><p className="font-mono text-xs uppercase tracking-[0.16em] text-[#a9231e]">Member information</p><h2 id="journey-member-heading" className="mt-2 text-2xl font-semibold">{detail.member_name}</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-black/60">Email</dt><dd className="mt-1 break-all font-semibold">{detail.email}</dd></div><div><dt className="text-black/60">Phone</dt><dd className="mt-1 font-semibold">{detail.phone ?? "Not provided"}</dd></div><div><dt className="text-black/60">Preferred contact</dt><dd className="mt-1 font-semibold capitalize">{detail.preferred_channel}</dd></div><div><dt className="text-black/60">Contact permission</dt><dd className="mt-1 font-semibold">{detail.do_not_contact ? "Do not contact" : "Contact permitted"}</dd></div></dl><div className="mt-4 flex flex-wrap gap-2 text-sm"><span className="rounded-full bg-black/5 px-3 py-1.5">Previous visits: <strong>{detail.previous_visits}</strong></span><span className="rounded-full bg-black/5 px-3 py-1.5">Current visits: <strong>{detail.current_visits}</strong></span><span className="rounded-full bg-black/5 px-3 py-1.5 capitalize"><strong>{detail.risk_level}</strong> risk</span></div></section><StaffRetentionJourney reviewStatus={detail.review_status} outreachStatus={latest?.status} responseOutcome={latest?.response_outcome} resolutionReason={detail.resolution_reason} doNotContact={detail.do_not_contact} canStartOutreach={queueState?.can_start_outreach} blockedReason={queueState?.outreach_blocked_reason} /><section className="grid gap-4 md:grid-cols-2"><div className="rounded-3xl bg-white/65 p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/60">Detected</p><p className="mt-2 text-lg font-semibold">{dateFormatter.format(new Date(detail.evaluated_at))}</p><p className="mt-2 text-sm text-black/65 capitalize">{detail.risk_level} risk · {detail.decline_percentage}% decline</p></div><div className="rounded-3xl bg-white/65 p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/60">Current state</p><p className="mt-2 text-lg font-semibold capitalize">{latest?.status ?? detail.review_status.replaceAll("_", " ")}</p><p className="mt-2 text-sm text-black/65">Complete the current responsibility below. Each command refreshes this authoritative state.</p></div></section><StaffRetentionWorkflowActions riskId={riskId} reviewStatus={detail.review_status} phone={detail.phone} doNotContact={detail.do_not_contact} resolutionReason={detail.resolution_reason} latest={latest} canStartOutreach={queueState?.can_start_outreach ?? false} blockedReason={queueState?.outreach_blocked_reason ?? null} /></div> : null}
      <div className="mt-6 flex w-full justify-end border-t border-black/10 pt-6"><Link href="/staff/retention" className="inline-flex min-h-11 items-center rounded-full border border-black/15 bg-white/70 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">← Back to member retention</Link></div>
    </PortalShell>
  );
}
