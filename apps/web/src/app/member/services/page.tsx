import Link from "next/link";
import { ArrowUpRight, Bike, BookOpen, Compass, Dumbbell, HeartPulse, MessageCircle, PauseCircle, ShieldCheck, TicketCheck, UserRoundPlus, Users } from "lucide-react";

import { MemberPauseRequestForm } from "@/components/member-pause-request-form";
import { CancelMemberProgramRequest, MemberProgramRequestForm } from "@/components/member-program-request-form";
import { MemberStatusMessage } from "@/components/member-status-message";
import { PortalShell } from "@/components/portal-shell";
import { requireMember } from "@/lib/auth";
import { memberLinks } from "@/lib/member-navigation";

type SearchParams = Promise<{ error?: string; success?: string }>;
type Membership = { membership_id: string; plan_id: string; status: "active" | "paused" | "cancelled" };
type PauseRequest = { pause_request_id: string; requested_at: string; starts_at: string; ends_at: string; status: "pending" | "approved" | "denied"; decision_reason: string | null; fee_amount: number };
type ProgramRequest = { program_request_id: string; program_key: "friend_referral" | "mission_guide" | "guest_pass" | "wellness_orientation"; guest_name: string | null; status: "submitted" | "in_review" | "approved" | "completed" | "declined"; requested_at: string };

const dateFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });

function addCalendarDays(date: Date, days: number) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
  return next.toISOString().slice(0, 10);
}

export default async function MemberServicesPage({ searchParams }: { searchParams: SearchParams }) {
  const { error: statusError, success } = await searchParams;
  const { supabase, memberId } = await requireMember();
  const [membershipResult, pauseResult, programResult] = await Promise.all([
    supabase.from("memberships").select("membership_id,plan_id,status").eq("member_id", memberId).in("status", ["active", "paused"]).order("start_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("membership_pause_requests").select("pause_request_id,requested_at,starts_at,ends_at,status,decision_reason,fee_amount").order("requested_at", { ascending: false }).limit(5),
    supabase.from("member_program_requests").select("program_request_id,program_key,guest_name,status,requested_at").order("requested_at", { ascending: false }).limit(12),
  ]);
  const membership = membershipResult.data as Membership | null;
  const requests = (pauseResult.data ?? []) as PauseRequest[];
  const programRequests = (programResult.data ?? []) as ProgramRequest[];
  const hasPendingRequest = requests.some((request) => request.status === "pending");
  const canRequest = membership?.status === "active" && !hasPendingRequest;
  const minimumStart = addCalendarDays(new Date(), 30);
  const services = [
    { title: "Pulse Assistant", detail: "Ask about classes, preparation, booking, cancellations, and membership policies.", href: "/member?assistant=open", icon: MessageCircle },
    { title: "Membership guidance", detail: "Review credits, billing-cycle dates, membership status, and account details.", href: "/member/account", icon: ShieldCheck },
    { title: "Class preparation", detail: "Ask what to bring and how to prepare before your next session.", href: "/member?assistant=open", icon: BookOpen },
  ];
  const classServices = [
    {
      title: "Studio Flow",
      discipline: "Yoga",
      duration: "50 minutes",
      level: "All levels",
      detail: "A guided practice combining mobility, balance, breath, and controlled strength. Instructors offer options so newer and experienced members can move at an appropriate pace.",
      preparation: "Wear comfortable clothing and arrive a few minutes early to settle in.",
      href: "/member/classes?class=yoga",
      icon: HeartPulse,
    },
    {
      title: "Pulse Ride",
      discipline: "Cycling",
      duration: "45 minutes",
      level: "All levels",
      detail: "An instructor-led indoor ride focused on cardiovascular endurance, rhythm, and adjustable resistance. You control the intensity throughout the session.",
      preparation: "Arrive early if you would like help adjusting your bike before class.",
      href: "/member/classes?class=cycling",
      icon: Bike,
    },
    {
      title: "Power Interval",
      discipline: "HIIT",
      duration: "45 minutes",
      level: "Moderate to advanced",
      detail: "A faster-paced strength and conditioning class using timed work and recovery intervals. Instructors provide lower-impact modifications when needed.",
      preparation: "Bring water, wear supportive training shoes, and tell the instructor about any needed modifications.",
      href: "/member/classes?class=hiit",
      icon: Dumbbell,
    },
  ];
  const memberPrograms = [
    { key: "friend_referral" as const, title: "Refer a friend", detail: "Invite someone you know to discover Pulse Studio. Submit their information and the studio team will review the introduction.", label: "Submit referral", needsGuest: true, icon: UserRoundPlus },
    { key: "guest_pass" as const, title: "Guest pass", detail: "Request a studio visit for a friend. Guest-pass availability is reviewed before an invitation is confirmed.", label: "Request guest pass", needsGuest: true, icon: TicketCheck },
    { key: "mission_guide" as const, title: "Mission Guide", detail: "Enroll for guided monthly movement goals, class suggestions, and milestones designed to keep your routine progressing.", label: "Join Mission Guide", needsGuest: false, icon: Compass },
    { key: "wellness_orientation" as const, title: "Wellness orientation", detail: "Ask for a studio orientation to discuss class formats, weekly planning, and the best place to begin.", label: "Request orientation", needsGuest: false, icon: Users },
  ];

  return <PortalShell audience="member" eyebrow="Member portal" title="Services" description="Studio support and membership guidance." links={memberLinks} showHeader={false}>
    <header className="rounded-3xl bg-[#171717] p-6 text-white"><p className="font-mono text-xs uppercase tracking-[0.16em] text-white/65">Member services</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">How can we help?</h1><p className="mt-2 text-sm text-white/70">Use approved studio guidance or submit a membership service request.</p></header>
    <MemberStatusMessage error={statusError} success={success} />

    <section className="mt-4 rounded-3xl border border-white/70 bg-white/68 p-5 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)] backdrop-blur-xl sm:p-6" aria-labelledby="class-services-title">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-black/60">Studio classes</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 id="class-services-title" className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Choose how you want to move</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-black/65">Learn what to expect, how to prepare, and then open the schedule already filtered to that class.</p></div>
        <Link href="/member/classes" className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full border border-black/20 px-4 text-sm font-semibold transition hover:border-black hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">View all classes <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {classServices.map(({ title, discipline, duration, level, detail, preparation, href, icon: Icon }) => <article key={discipline} className="flex flex-col rounded-3xl border border-white/80 bg-[#f7f4ee]/85 p-5 shadow-[0_0.75rem_2rem_rgba(17,17,17,0.05)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3"><span className="grid size-11 place-items-center rounded-full bg-[#c72c25] text-white"><Icon className="size-5" aria-hidden="true" /></span><span className="rounded-full border border-black/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-black/65">{discipline}</span></div>
          <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em]">{title}</h3>
          <p className="mt-1 text-sm font-semibold text-black/65">{duration} · {level}</p>
          <p className="mt-4 text-sm leading-6 text-black/70">{detail}</p>
          <div className="mb-5 mt-4 border-t border-black/10 pt-4"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-black/55">Before class</p><p className="mt-1 text-sm leading-6 text-black/65">{preparation}</p></div>
          <Link href={href} className="mt-auto inline-flex min-h-11 items-center justify-between rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:bg-[#c72c25] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Find {discipline} classes <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
        </article>)}
      </div>
    </section>

    <section className="mt-4 rounded-3xl border border-black/10 bg-[#eee6dc] p-5 text-black sm:p-6" aria-labelledby="member-programs-title">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-black/60">Member programs</p>
      <h2 id="member-programs-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">More ways to take part</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-black/65">Submit a service request here, then return to see whether it is submitted, under review, approved, or completed.</p>
      {programResult.error ? <div role="alert" className="mt-5 rounded-2xl border border-[#c72c25]/25 bg-white/70 p-4 text-sm text-[#8e211c]">Member programs are temporarily unavailable.</div> : <div className="mt-5 grid items-start gap-3 md:grid-cols-2">
        {memberPrograms.map(({ key, title, detail, label, needsGuest, icon: Icon }) => {
          const openRequest = programRequests.find((request) => request.program_key === key && ["submitted", "in_review", "approved"].includes(request.status));
          const cancellable = openRequest && ["submitted", "in_review"].includes(openRequest.status);
          return <article key={key} className="flex flex-col self-start rounded-2xl border border-black/10 bg-white/72 p-4 shadow-[0_0.75rem_2rem_rgba(17,17,17,0.05)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3"><span className="grid size-9 place-items-center rounded-full bg-[#c72c25] text-white"><Icon className="size-4" aria-hidden="true" /></span>{openRequest ? <span className="rounded-full border border-black/10 bg-[#f7f4ee] px-2.5 py-1 text-xs font-semibold capitalize text-black/70">{openRequest.status.replace("_", " ")}</span> : null}</div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3><p className="mt-1.5 text-sm leading-5 text-black/65">{detail}</p>
            {openRequest ? <div className="mt-auto pt-4"><p className="rounded-xl border border-black/10 bg-[#f7f4ee] p-3 text-sm text-black/70">Request submitted {dateFormatter.format(new Date(openRequest.requested_at))}{openRequest.guest_name ? ` for ${openRequest.guest_name}` : ""}. {cancellable ? "You may cancel while studio review is pending." : "The studio has approved this request; contact staff if your plans change."}</p>{cancellable ? <CancelMemberProgramRequest requestId={openRequest.program_request_id} /> : null}</div> : <MemberProgramRequestForm programKey={key} label={label} needsGuest={needsGuest} />}
          </article>;
        })}
      </div>}
    </section>

    <div className="mt-4 grid gap-4">
    <section className="rounded-3xl border border-black/10 bg-[#eee6dc] p-5 sm:p-6" aria-labelledby="pause-service-title">
      <PauseCircle className="size-5 text-[#c72c25]" aria-hidden="true" /><p className="mt-5 font-mono text-xs uppercase tracking-[0.14em] text-black/60">Membership service</p><h2 id="pause-service-title" className="mt-2 text-2xl font-semibold">Request a membership pause</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-black/65">Choose dates at least 30 days in advance. A pause must last 30–90 days, requires staff approval, and carries a simulated $25 administration fee only when approved.</p>
      {membershipResult.error ? <div role="alert" className="mt-5 rounded-2xl border border-[#c72c25]/30 bg-white/70 p-4 text-sm text-[#8e211c]">Your membership could not be verified, so pause requests are temporarily unavailable.</div> : !membership ? <p className="mt-5 rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-black/65">No active or paused membership is available for this service.</p> : <><MemberPauseRequestForm disabled={!canRequest} membershipId={membership.membership_id} minimumStart={minimumStart} />{!canRequest ? <p className="mt-3 text-sm font-medium text-[#8e211c]">{hasPendingRequest ? "A pause request is already awaiting staff review." : "A new pause can only be requested while the membership is active."}</p> : null}</>}
    </section>

    <section className="mt-4 rounded-3xl border border-white/70 bg-white/68 p-5 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)] backdrop-blur-xl sm:p-6" aria-labelledby="pause-history-title"><p className="font-mono text-xs uppercase tracking-[0.14em] text-black/60">Request history</p><h2 id="pause-history-title" className="mt-2 text-2xl font-semibold">Membership pause requests</h2>{pauseResult.error ? <div role="alert" className="mt-4 text-sm text-[#8e211c]">Pause-request history is temporarily unavailable.</div> : requests.length === 0 ? <p className="mt-3 text-sm text-black/65">You have not submitted a membership pause request.</p> : <ol className="mt-4 divide-y divide-black/10">{requests.map((request) => <li key={request.pause_request_id} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-semibold">{dateFormatter.format(new Date(request.starts_at))}–{dateFormatter.format(new Date(request.ends_at))}</p><p className="mt-1 text-sm text-black/65">Requested {dateFormatter.format(new Date(request.requested_at))}{request.decision_reason ? ` · ${request.decision_reason}` : ""}</p></div><div className="sm:text-right"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${request.status === "approved" ? "bg-emerald-100 text-emerald-900" : request.status === "denied" ? "bg-red-100 text-red-900" : "bg-amber-100 text-amber-900"}`}>{request.status}</span>{request.status === "approved" ? <p className="mt-1 text-xs text-black/60">Simulated fee ${Number(request.fee_amount).toFixed(2)}</p> : null}</div></li>)}</ol>}</section>

    <section className="mt-4 grid gap-3 md:grid-cols-3">{services.map(({ title, detail, href, icon: Icon }) => <Link key={title} href={href} className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)] backdrop-blur-xl transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2"><Icon className="size-5 text-[#c72c25]" aria-hidden="true" /><h2 className="mt-6 text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-black/65">{detail}</p></Link>)}</section>
    </div>
  </PortalShell>;
}
