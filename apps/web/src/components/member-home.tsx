import Link from "next/link";
import { ArrowRight, CalendarDays, MessageCircle } from "lucide-react";

import type { MemberDashboardReservation, MemberDashboardSummary } from "@/components/member-dashboard";

const timeZone = "America/New_York";
const dateFormatter = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
const cycleFormatter = new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" });

type MemberHomeProps = {
  reservationError?: string;
  reservations: MemberDashboardReservation[];
  summary: MemberDashboardSummary;
};

export function MemberHome({ reservationError, reservations, summary }: MemberHomeProps) {
  const firstName = summary.member_name.split(" ")[0];
  const nextReservation = reservations[0];
  const active = summary.membership_status === "active";

  return <div className="space-y-4 sm:space-y-5">
    <section className="overflow-hidden rounded-3xl bg-[#171717] p-5 text-white shadow-[0_1.5rem_4rem_rgba(17,17,17,0.18)] sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div><p className="font-mono text-xs uppercase tracking-[0.16em] text-white/65">Member home</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">Hello, {firstName}.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-white/70">Here is what matters for your next visit.</p></div>
        <div className="grid grid-cols-3 divide-x divide-white/15 overflow-hidden rounded-2xl border border-white/15 bg-white/8"><div className="p-3 sm:px-5"><p className="text-xs text-white/65">Available</p><p className="text-2xl font-semibold">{summary.classes_remaining}</p></div><div className="p-3 sm:px-5"><p className="text-xs text-white/65">Reserved</p><p className="text-2xl font-semibold">{summary.classes_reserved}</p></div><div className="p-3 sm:px-5"><p className="text-xs text-white/65">Used</p><p className="text-2xl font-semibold">{summary.classes_used}</p></div></div>
      </div>
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-3xl border border-white/65 bg-white/68 p-5 shadow-[0_1rem_3rem_rgba(17,17,17,0.07)] backdrop-blur-xl sm:p-6">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-black/60">Next reservation</p>
        {reservationError ? <div role="alert" className="mt-4 rounded-2xl border border-[#c72c25]/25 bg-[#c72c25]/5 p-4 text-sm text-[#8e211c]">Your reservations could not be loaded. Refresh before planning your next visit.</div> : nextReservation ? <div className="mt-4"><h2 className="text-2xl font-semibold tracking-[-0.04em]">{nextReservation.class_type_label}</h2><p className="mt-2 text-sm font-semibold">{dateFormatter.format(new Date(nextReservation.starts_at))} · {timeFormatter.format(new Date(nextReservation.starts_at))}</p><p className="mt-1 text-sm text-black/65">with {nextReservation.instructor_name} · {nextReservation.reservation_status === "waitlisted" ? "Waitlisted" : "Confirmed"}</p><Link href="/member/reservations" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Manage reservations <ArrowRight className="size-4" aria-hidden="true" /></Link></div> : <div className="mt-4"><h2 className="text-2xl font-semibold">No upcoming reservations</h2><p className="mt-2 text-sm text-black/65">Choose a class when you are ready.</p></div>}
      </div>
      <div className="rounded-3xl border border-black/10 bg-[#eee6dc] p-5 sm:p-6"><p className="font-mono text-xs uppercase tracking-[0.14em] text-black/60">Membership health</p><h2 className="mt-3 text-2xl font-semibold">{summary.plan_name}</h2><div className="mt-3 flex items-center gap-2 text-sm capitalize"><span className={`size-2 rounded-full ${active ? "bg-emerald-700" : "bg-amber-600"}`} aria-hidden="true" />{summary.membership_status}</div><p className="mt-2 text-sm text-black/65">Current cycle ends {cycleFormatter.format(new Date(summary.billing_cycle_end_at))}.</p><Link href="/member/account" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline decoration-[#c72c25] decoration-2 underline-offset-4">View account <ArrowRight className="size-4" aria-hidden="true" /></Link></div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2">
      <Link href="/member/classes" className="rounded-3xl bg-[#c72c25] p-5 text-white shadow-[0_1rem_3rem_rgba(142,33,28,0.18)] transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-black focus-visible:outline-offset-2"><CalendarDays className="size-5" aria-hidden="true" /><span className="mt-6 block text-2xl font-semibold">Book a class</span><span className="mt-1 block text-sm text-white/75">Open the seven-day schedule</span></Link>
      <Link href="/member?assistant=open" className="rounded-3xl bg-black p-5 text-white shadow-[0_1rem_3rem_rgba(17,17,17,0.16)] transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2"><MessageCircle className="size-5" aria-hidden="true" /><span className="mt-6 block text-2xl font-semibold">Ask Pulse</span><span className="mt-1 block text-sm text-white/75">Get approved studio guidance</span></Link>
    </section>
  </div>;
}
