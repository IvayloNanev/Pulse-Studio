import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";

import { MemberReservationCancellation } from "@/components/member-reservation-cancellation";
import { MemberRefreshButton } from "@/components/member-refresh-button";
import { MemberStatusMessage } from "@/components/member-status-message";
import { PortalShell } from "@/components/portal-shell";
import { requireMember } from "@/lib/auth";
import { memberLinks } from "@/lib/member-navigation";

const timeZone = "America/New_York";
const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
const dayHeadingFormatter = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "long", day: "numeric" });
const dayFormatter = new Intl.DateTimeFormat("en-US", { timeZone, day: "numeric" });
const monthFormatter = new Intl.DateTimeFormat("en-US", { timeZone, month: "short" });
const timeFormatter = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" });

type MemberReservation = {
  reservation_id: string;
  reservation_status: "confirmed" | "waitlisted";
  class_type: "yoga" | "cycling" | "hiit";
  class_type_label: string;
  starts_at: string;
  instructor_name: string;
  cancellation_deadline: string;
};

const classNames = { yoga: "Studio Flow", cycling: "Pulse Ride", hiit: "Power Interval" };

function dateKey(value: string) {
  const parts = dateKeyFormatter.formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const { supabase } = await requireMember();
  const params = await searchParams;
  const fetchedAt = new Date().toISOString();
  const { data, error } = await supabase.rpc("member_reservations", { p_from: fetchedAt });
  const reservations = (data ?? []) as MemberReservation[];
  const grouped = reservations.reduce<Array<{ key: string; date: Date; reservations: MemberReservation[] }>>((groups, reservation) => {
    const key = dateKey(reservation.starts_at);
    const existing = groups.find((group) => group.key === key);
    if (existing) existing.reservations.push(reservation);
    else groups.push({ key, date: new Date(reservation.starts_at), reservations: [reservation] });
    return groups;
  }, []);

  return (
    <PortalShell audience="member" eyebrow="Reservations" title="Manage your classes" description="Review and manage your upcoming reservations." links={memberLinks} showHeader={false}>
      <MemberStatusMessage success={params.success} error={params.error} />
      <header className="overflow-hidden rounded-3xl border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(238,230,220,0.62))] p-4 shadow-[0_1.25rem_3rem_rgba(17,17,17,0.10),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl sm:p-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-black/65"><CalendarDays className="size-4 text-[#c72c25]" aria-hidden="true" /> Reservations</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Manage your classes</h1><p className="mt-2 text-sm text-black/65">{reservations.length} upcoming {reservations.length === 1 ? "reservation" : "reservations"} · updated {timeFormatter.format(new Date(fetchedAt))}</p></div>
          <div className="flex flex-wrap gap-2"><MemberRefreshButton className="rounded-full border border-black/15 bg-white/65 px-4 text-sm" /><Link href="/member/classes" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-[#c72c25] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Book another class <ArrowRight className="size-4" aria-hidden="true" /></Link></div>
        </div>
      </header>

      <section className="mt-4 rounded-3xl border border-white/55 bg-[rgba(238,230,220,0.72)] p-4 shadow-[0_1rem_3rem_rgba(17,17,17,0.08),inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl sm:mt-5 sm:p-6" aria-label="Upcoming reservations">
        {error ? <div role="alert" className="rounded-2xl border border-[#c72c25]/30 bg-white/65 p-5 text-sm text-[#8e211c]">Your reservations could not be loaded. Refresh and try again.</div> : reservations.length === 0 ? <div className="rounded-2xl border border-white/70 bg-white/60 p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"><h2 className="text-2xl font-semibold">Nothing booked yet</h2><p className="mt-2 text-sm text-black/65">Choose a class and it will appear here immediately.</p><Link href="/member/classes" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-black px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Browse classes</Link></div> : <div className="space-y-6">{grouped.map((group) => <section key={group.key} aria-labelledby={`day-${group.key}`}><div className="mb-3 flex items-center justify-between gap-3"><h2 id={`day-${group.key}`} className="text-lg font-semibold tracking-[-0.02em] sm:text-xl">{dayHeadingFormatter.format(group.date)}</h2><span className="text-sm text-black/60">{group.reservations.length} {group.reservations.length === 1 ? "class" : "classes"}</span></div><div className="grid gap-3 xl:grid-cols-2">{group.reservations.map((reservation) => {
          const startsAt = new Date(reservation.starts_at);
          return <article key={reservation.reservation_id} className="rounded-2xl border border-white/75 bg-white/62 p-4 shadow-[0_0.75rem_2rem_rgba(17,17,17,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-xl"><div className="grid grid-cols-[3.75rem_minmax(0,1fr)] gap-3"><div className="rounded-xl bg-[#171717] px-2 py-2 text-center text-white" aria-hidden="true"><span className="block text-xs font-semibold uppercase tracking-[0.12em] text-white/70">{monthFormatter.format(startsAt)}</span><span className="block text-2xl font-semibold leading-none">{dayFormatter.format(startsAt)}</span></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold tracking-[-0.025em]">{classNames[reservation.class_type] ?? reservation.class_type_label}</h3><span className="rounded-full border border-black/15 bg-white/55 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em]">{reservation.reservation_status === "waitlisted" ? "Waitlisted" : "Confirmed"}</span></div><p className="mt-1 text-sm font-semibold">{reservation.class_type_label} · {timeFormatter.format(startsAt)}</p><p className="mt-1 text-sm text-black/65">with {reservation.instructor_name}</p></div></div><MemberReservationCancellation reservation={reservation} returnTo="/member/reservations" now={fetchedAt} /></article>;
        })}</div></section>)}</div>}
      </section>
    </PortalShell>
  );
}
