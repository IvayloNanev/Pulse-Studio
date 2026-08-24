"use client";

import Link from "next/link";
import { ArrowRight, Bell, CalendarDays, CircleUserRound, Search } from "lucide-react";
import { useState } from "react";

import type { MemberDashboardSummary } from "@/components/member-dashboard";

const timeZone = "America/New_York";
const cycleFormatter = new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" });

type MemberHomeProps = {
  memberSince?: string;
  notificationError?: string;
  notifications: Array<{
    notification_id: string;
    event_type: string;
    channel: string;
    status: string;
    created_at: string;
    related_record_type: string;
  }>;
  summary: MemberDashboardSummary;
};

const notificationLabels: Record<string, string> = {
  booking_confirmed: "Class reservation confirmed",
  waitlist_promoted: "You moved off the waitlist",
  member_cancelled: "Reservation cancellation recorded",
  studio_cancelled: "The studio cancelled a class",
  class_changed: "A class schedule changed",
  reengagement_outreach: "A studio follow-up is available",
  membership_pause_requested: "Membership pause requested",
  membership_pause_approved: "Membership pause approved",
  membership_pause_denied: "Membership pause request updated",
};

const notificationFormatter = new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const memberSinceFormatter = new Intl.DateTimeFormat("en-US", { timeZone, month: "long", year: "numeric" });

export function MemberHome({ memberSince, notificationError, notifications, summary }: MemberHomeProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const firstName = summary.member_name.split(" ")[0];
  const active = summary.membership_status === "active";

  return <div className="space-y-4 sm:space-y-5">
    <section className="overflow-hidden rounded-3xl bg-[#171717] p-5 text-white shadow-[0_1.5rem_4rem_rgba(17,17,17,0.18)] sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div><div className="flex items-center justify-between gap-4"><p className="font-mono text-xs uppercase tracking-[0.16em] text-white/65">Member home</p><nav aria-label="Member shortcuts" className="flex items-center gap-1"><Link href="/member/account" aria-label="Open member information" className="inline-flex size-11 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><CircleUserRound className="size-5" aria-hidden="true" /></Link><Link href="/member/classes" aria-label="Search classes" className="inline-flex size-11 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><Search className="size-5" aria-hidden="true" /></Link><button type="button" onClick={() => setNotificationsOpen((open) => !open)} aria-expanded={notificationsOpen} aria-controls="member-notifications-panel" aria-label={`${notificationsOpen ? "Close" : "Open"} notifications${notifications.length ? `, ${notifications.length} recent` : ""}`} className="relative inline-flex size-11 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><Bell className="size-5" aria-hidden="true" />{notifications.length ? <span className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-[#ff5b52] px-1 text-center text-[0.62rem] font-bold leading-4 text-white">{notifications.length}</span> : null}</button><Link href="/member/reservations" aria-label="Open reservations calendar" className="inline-flex size-11 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><CalendarDays className="size-5" aria-hidden="true" /></Link></nav></div><h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">Hello, {firstName}.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-white/70">{memberSince ? `Member since ${memberSinceFormatter.format(new Date(`${memberSince}T12:00:00Z`))}.` : "Welcome to Pulse Studio."}</p></div>
        <div className="grid grid-cols-3 divide-x divide-white/15 overflow-hidden rounded-2xl border border-white/15 bg-white/8"><div className="p-3 sm:px-5"><p className="text-xs text-white/65">Available</p><p className="text-2xl font-semibold">{summary.classes_remaining}</p></div><div className="p-3 sm:px-5"><p className="text-xs text-white/65">Reserved</p><p className="text-2xl font-semibold">{summary.classes_reserved}</p></div><div className="p-3 sm:px-5"><p className="text-xs text-white/65">Used</p><p className="text-2xl font-semibold">{summary.classes_used}</p></div></div>
      </div>
    </section>

    {notificationsOpen ? <section id="member-notifications-panel" className="rounded-3xl border border-white/65 bg-white/82 p-5 shadow-[0_1.5rem_4rem_rgba(17,17,17,0.14)] backdrop-blur-2xl sm:p-6" aria-labelledby="notifications-title"><div className="flex items-center justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[0.14em] text-black/60">Updates</p><h2 id="notifications-title" className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Notifications</h2></div><button type="button" onClick={() => setNotificationsOpen(false)} className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold underline decoration-[#c72c25] decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Close</button></div>{notificationError ? <div role="alert" className="mt-4 rounded-2xl border border-[#c72c25]/25 bg-[#c72c25]/5 p-4 text-sm text-[#8e211c]">{notificationError}</div> : notifications.length ? <ol className="mt-4 divide-y divide-black/10">{notifications.map((notification) => <li key={notification.notification_id} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center"><p className="text-sm font-semibold">{notificationLabels[notification.event_type] ?? "Pulse Studio account update"}</p><time dateTime={notification.created_at} className="text-xs text-black/60">{notificationFormatter.format(new Date(notification.created_at))}</time></li>)}</ol> : <p className="mt-4 text-sm text-black/65">You have no recent notifications.</p>}</section> : null}

    <div className="grid gap-4 xl:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)] xl:items-stretch">
    <section className="h-full">
      <div className="flex h-full flex-col rounded-3xl border border-black/10 bg-[#eee6dc] p-5 sm:p-6 xl:p-7"><p className="font-mono text-xs uppercase tracking-[0.14em] text-black/65">Membership health</p><h2 className="mt-3 text-2xl font-semibold">{summary.plan_name}</h2><div className="mt-3 flex items-center gap-2 text-sm capitalize"><span className={`size-2 rounded-full ${active ? "bg-emerald-700" : "bg-amber-600"}`} aria-hidden="true" />{summary.membership_status}</div><p className="mt-2 text-sm text-black/65">Current cycle ends {cycleFormatter.format(new Date(summary.billing_cycle_end_at))}.</p><Link href="/member/account" className="mt-auto inline-flex min-h-11 items-center gap-2 pt-5 text-sm font-semibold underline decoration-[#c72c25] decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">View account <ArrowRight className="size-4" aria-hidden="true" /></Link></div>
    </section>

    <section className="rounded-3xl border border-white/70 bg-white/55 p-5 shadow-[0_1rem_3rem_rgba(17,17,17,0.05)] backdrop-blur-xl sm:p-6 xl:p-7" aria-labelledby="studio-essentials-title">
      <div className="mb-3"><p className="font-mono text-xs uppercase tracking-[0.14em] text-black/60">Before your next visit</p><h2 id="studio-essentials-title" className="mt-1 text-2xl font-semibold tracking-[-0.035em]">Studio essentials</h2></div>
      <div className="flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 xl:h-[calc(100%-3.5rem)]">
        <article className="min-w-[82%] snap-start rounded-3xl border border-black/10 bg-white/72 p-5 backdrop-blur-xl sm:min-w-0"><p className="font-mono text-xs uppercase tracking-[0.12em] text-[#8e211c]">Cancellation</p><h3 className="mt-3 text-lg font-semibold">Keep your credit</h3><p className="mt-2 text-sm leading-6 text-black/65">Cancel at least 12 hours before class. Cancelling exactly at the deadline still returns an included credit.</p></article>
        <article className="min-w-[82%] snap-start rounded-3xl border border-black/10 bg-white/72 p-5 backdrop-blur-xl sm:min-w-0"><p className="font-mono text-xs uppercase tracking-[0.12em] text-[#8e211c]">Membership pause</p><h3 className="mt-3 text-lg font-semibold">Plan ahead</h3><p className="mt-2 text-sm leading-6 text-black/65">Pause requests need 30 days’ notice, may last 30–90 days, and include a simulated $25 fee when approved.</p></article>
        <article className="min-w-[82%] snap-start rounded-3xl border border-black/10 bg-white/72 p-5 backdrop-blur-xl sm:min-w-0"><p className="font-mono text-xs uppercase tracking-[0.12em] text-[#8e211c]">Class credits</p><h3 className="mt-3 text-lg font-semibold">Know what counts</h3><p className="mt-2 text-sm leading-6 text-black/65">Attended classes, no-shows, and late cancellations use credits. Studio cancellations do not.</p></article>
      </div>
    </section>
    </div>

  </div>;
}
