import Link from "next/link";
import { BookOpen, MessageCircle, PauseCircle, ShieldCheck } from "lucide-react";

import { MemberPauseRequestForm } from "@/components/member-pause-request-form";
import { MemberStatusMessage } from "@/components/member-status-message";
import { PortalShell } from "@/components/portal-shell";
import { requireMember } from "@/lib/auth";
import { memberLinks } from "@/lib/member-navigation";

type SearchParams = Promise<{ error?: string; success?: string }>;
type Membership = { membership_id: string; plan_id: string; status: "active" | "paused" | "cancelled" };
type PauseRequest = { pause_request_id: string; requested_at: string; starts_at: string; ends_at: string; status: "pending" | "approved" | "denied"; decision_reason: string | null; fee_amount: number };

const dateFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });

function addCalendarDays(date: Date, days: number) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
  return next.toISOString().slice(0, 10);
}

export default async function MemberServicesPage({ searchParams }: { searchParams: SearchParams }) {
  const { error: statusError, success } = await searchParams;
  const { supabase, memberId } = await requireMember();
  const [membershipResult, pauseResult] = await Promise.all([
    supabase.from("memberships").select("membership_id,plan_id,status").eq("member_id", memberId).in("status", ["active", "paused"]).order("start_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("membership_pause_requests").select("pause_request_id,requested_at,starts_at,ends_at,status,decision_reason,fee_amount").order("requested_at", { ascending: false }).limit(5),
  ]);
  const membership = membershipResult.data as Membership | null;
  const requests = (pauseResult.data ?? []) as PauseRequest[];
  const hasPendingRequest = requests.some((request) => request.status === "pending");
  const canRequest = membership?.status === "active" && !hasPendingRequest;
  const minimumStart = addCalendarDays(new Date(), 30);
  const services = [
    { title: "Pulse Assistant", detail: "Ask about classes, preparation, booking, cancellations, and membership policies.", href: "/member?assistant=open", icon: MessageCircle },
    { title: "Membership guidance", detail: "Review credits, billing-cycle dates, membership status, and account details.", href: "/member/account", icon: ShieldCheck },
    { title: "Class preparation", detail: "Ask what to bring and how to prepare before your next session.", href: "/member?assistant=open", icon: BookOpen },
  ];

  return <PortalShell audience="member" eyebrow="Member portal" title="Services" description="Studio support and membership guidance." links={memberLinks} showHeader={false}>
    <header className="rounded-3xl bg-[#171717] p-6 text-white"><p className="font-mono text-xs uppercase tracking-[0.16em] text-white/65">Member services</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">How can we help?</h1><p className="mt-2 text-sm text-white/70">Use approved studio guidance or submit a membership service request.</p></header>
    <MemberStatusMessage error={statusError} success={success} />

    <section className="mt-4 rounded-3xl border border-black/10 bg-[#eee6dc] p-5 sm:p-6" aria-labelledby="pause-service-title">
      <PauseCircle className="size-5 text-[#c72c25]" aria-hidden="true" /><p className="mt-5 font-mono text-xs uppercase tracking-[0.14em] text-black/60">Membership service</p><h2 id="pause-service-title" className="mt-2 text-2xl font-semibold">Request a membership pause</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-black/65">Choose dates at least 30 days in advance. A pause must last 30–90 days, requires staff approval, and carries a simulated $25 administration fee only when approved.</p>
      {membershipResult.error ? <div role="alert" className="mt-5 rounded-2xl border border-[#c72c25]/30 bg-white/70 p-4 text-sm text-[#8e211c]">Your membership could not be verified, so pause requests are temporarily unavailable.</div> : !membership ? <p className="mt-5 rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-black/65">No active or paused membership is available for this service.</p> : <><MemberPauseRequestForm disabled={!canRequest} membershipId={membership.membership_id} minimumStart={minimumStart} />{!canRequest ? <p className="mt-3 text-sm font-medium text-[#8e211c]">{hasPendingRequest ? "A pause request is already awaiting staff review." : "A new pause can only be requested while the membership is active."}</p> : null}</>}
    </section>

    <section className="mt-4 rounded-3xl border border-white/70 bg-white/68 p-5 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)] backdrop-blur-xl sm:p-6" aria-labelledby="pause-history-title"><p className="font-mono text-xs uppercase tracking-[0.14em] text-black/60">Request history</p><h2 id="pause-history-title" className="mt-2 text-2xl font-semibold">Membership pause requests</h2>{pauseResult.error ? <div role="alert" className="mt-4 text-sm text-[#8e211c]">Pause-request history is temporarily unavailable.</div> : requests.length === 0 ? <p className="mt-3 text-sm text-black/65">You have not submitted a membership pause request.</p> : <ol className="mt-4 divide-y divide-black/10">{requests.map((request) => <li key={request.pause_request_id} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-semibold">{dateFormatter.format(new Date(request.starts_at))}–{dateFormatter.format(new Date(request.ends_at))}</p><p className="mt-1 text-sm text-black/65">Requested {dateFormatter.format(new Date(request.requested_at))}{request.decision_reason ? ` · ${request.decision_reason}` : ""}</p></div><div className="sm:text-right"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${request.status === "approved" ? "bg-emerald-100 text-emerald-900" : request.status === "denied" ? "bg-red-100 text-red-900" : "bg-amber-100 text-amber-900"}`}>{request.status}</span>{request.status === "approved" ? <p className="mt-1 text-xs text-black/60">Simulated fee ${Number(request.fee_amount).toFixed(2)}</p> : null}</div></li>)}</ol>}</section>

    <section className="mt-4 grid gap-3 md:grid-cols-3">{services.map(({ title, detail, href, icon: Icon }) => <Link key={title} href={href} className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)] backdrop-blur-xl transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2"><Icon className="size-5 text-[#c72c25]" aria-hidden="true" /><h2 className="mt-6 text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-black/65">{detail}</p></Link>)}</section>
  </PortalShell>;
}
