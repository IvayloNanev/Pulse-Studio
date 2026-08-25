import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";

import { MemberRefreshButton } from "@/components/member-refresh-button";
import { MemberStatusMessage } from "@/components/member-status-message";
import { PortalShell } from "@/components/portal-shell";
import { requireMember } from "@/lib/auth";
import { newYorkDateParts, newYorkMonthWindow } from "@/lib/member-calendar";
import { memberLinks } from "@/lib/member-navigation";

const timeZone = "America/New_York";
const monthHeading = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
const dayHeading = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "long", day: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" });

type Activity = {
  reservation_id: string;
  reservation_status: "confirmed" | "waitlisted" | "cancelled" | "studio_cancelled";
  attendance_status: "attended" | "no_show" | null;
  class_type: "yoga" | "cycling" | "hiit";
  class_type_label: string;
  starts_at: string;
  ends_at: string;
  instructor_name: string;
  cancellation_deadline: string;
};

type ActivityStats = {
  total_check_ins: number;
  classes_this_month: number;
};

const classNames = { yoga: "Studio Flow", cycling: "Pulse Ride", hiit: "Power Interval" };
const statusStyle = {
  attended: { label: "Attended", dot: "bg-emerald-600", badge: "border-emerald-700/25 bg-emerald-700/10 text-emerald-900" },
  no_show: { label: "No-show", dot: "bg-[#c72c25]", badge: "border-[#c72c25]/25 bg-[#c72c25]/10 text-[#8e211c]" },
  confirmed: { label: "Reserved", dot: "bg-black", badge: "border-black/15 bg-black/5 text-black" },
  waitlisted: { label: "Waitlisted", dot: "bg-amber-500", badge: "border-amber-700/25 bg-amber-600/10 text-amber-950" },
  cancelled: { label: "Cancelled", dot: "bg-black/30", badge: "border-black/10 bg-black/5 text-black/65" },
  studio_cancelled: { label: "Studio cancelled", dot: "bg-violet-600", badge: "border-violet-700/20 bg-violet-600/10 text-violet-950" },
  pending: { label: "Awaiting attendance", dot: "bg-sky-500", badge: "border-sky-700/20 bg-sky-600/10 text-sky-950" },
} as const;

function activityStatus(activity: Activity, now: number): keyof typeof statusStyle {
  if (activity.attendance_status) return activity.attendance_status;
  if (activity.reservation_status === "cancelled" || activity.reservation_status === "studio_cancelled") return activity.reservation_status;
  if (new Date(activity.starts_at).getTime() >= now) return activity.reservation_status;
  return "pending";
}

function dateKey(value: string) {
  const parts = newYorkDateParts(new Date(value));
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function monthHref(year: number, month: number, offset: number) {
  const date = new Date(Date.UTC(year, month - 1 + offset, 1, 12));
  return `/member/reservations?month=${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ month?: string; day?: string; success?: string; error?: string }> }) {
  const { supabase } = await requireMember();
  const params = await searchParams;
  const now = new Date();
  const today = newYorkDateParts(now);
  const match = params.month?.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  const year = match ? Number(match[1]) : today.year;
  const month = match ? Number(match[2]) : today.month;
  const { startsAt, endsAt } = newYorkMonthWindow(year, month);
  const [{ data, error }, { data: statsData, error: statsError }] = await Promise.all([
    supabase.rpc("member_activity", { p_from: startsAt.toISOString(), p_to: endsAt.toISOString() }),
    supabase.rpc("member_activity_stats", { p_month_from: startsAt.toISOString(), p_month_to: endsAt.toISOString() }),
  ]);
  const activities = ((data ?? []) as Activity[]).filter((activity) => new Date(activity.starts_at).getTime() < now.getTime());
  const stats = ((statsData ?? [])[0] ?? null) as ActivityStats | null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const activityByDay = new Map<string, Activity[]>();
  for (const activity of activities) {
    const key = dateKey(activity.starts_at);
    activityByDay.set(key, [...(activityByDay.get(key) ?? []), activity]);
  }
  const selectedDay = params.day && activityByDay.has(params.day) ? params.day : null;
  const visibleActivityDays = selectedDay
    ? [[selectedDay, activityByDay.get(selectedDay) ?? []] as const]
    : Array.from(activityByDay.entries());
  const viewedMonth = `${year}-${String(month).padStart(2, "0")}`;
  const currentMonth = `${today.year}-${String(today.month).padStart(2, "0")}`;
  const selectedDateHeading = selectedDay && visibleActivityDays[0]?.[1][0]
    ? dayHeading.format(new Date(visibleActivityDays[0][1][0].starts_at))
    : null;
  const calendarSlots = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const calendarWeeks = Array.from({ length: Math.ceil(calendarSlots.length / 7) }, (_, index) =>
    calendarSlots.slice(index * 7, index * 7 + 7),
  );

  return (
    <PortalShell audience="member" eyebrow="Activity" title="Your activity" description="Your completed classes and attendance history." links={memberLinks} showHeader={false}>
      <MemberStatusMessage success={params.success} error={params.error} />
      <header className="overflow-hidden rounded-3xl border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(238,230,220,0.66))] p-4 shadow-[0_1.25rem_3rem_rgba(17,17,17,0.10),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl sm:p-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-black/65"><CalendarDays className="size-4 text-[#c72c25]" aria-hidden="true" /> Activity</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Your studio history</h1><p className="mt-2 text-sm text-black/65">Past classes and attendance outcomes · updated {timeFormatter.format(now)}</p></div>
          <div className="flex flex-wrap gap-2"><MemberRefreshButton className="rounded-full border border-black/15 bg-white/65 px-4 text-sm" /><Link href="/member/classes" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-[#c72c25] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Find a class <ArrowRight className="size-4" aria-hidden="true" /></Link></div>
        </div>
      </header>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(19rem,0.65fr)] xl:items-start xl:gap-6">
      <section className="rounded-3xl border border-white/55 bg-[rgba(238,230,220,0.74)] p-3 shadow-[0_1rem_3rem_rgba(17,17,17,0.08),inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl sm:p-6" aria-labelledby="activity-month">
        <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2 px-1 pb-3"><Link href={monthHref(year, month, -1)} aria-label="Previous month" className="inline-flex size-11 items-center justify-center rounded-full border border-black/15 bg-white/65 transition hover:border-black/30 hover:bg-white focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2"><ArrowLeft className="size-5" aria-hidden="true" /></Link><h2 id="activity-month" className="text-center text-xl font-semibold sm:text-2xl">{monthHeading.format(new Date(Date.UTC(year, month - 1, 1)))}</h2><Link href={monthHref(year, month, 1)} aria-label="Next month" className="inline-flex size-11 items-center justify-center rounded-full border border-black/15 bg-white/65 transition hover:border-black/30 hover:bg-white focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2"><ArrowRight className="size-5" aria-hidden="true" /></Link></div>
        <div className="mb-3 flex justify-center"><Link href={`/member/reservations?month=${currentMonth}`} aria-label="Go to the current month" className="inline-flex min-h-11 items-center rounded-full border border-black/15 bg-white/55 px-4 text-sm font-semibold transition hover:border-black/30 hover:bg-white focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Today</Link></div>
        {error ? <div role="alert" className="rounded-2xl border border-[#c72c25]/30 bg-white/65 p-5 text-sm text-[#8e211c]">Your activity could not be loaded. Refresh and try again.</div> : <><p id="calendar-instructions" className="mb-2 text-xs text-black/60">Choose a date with activity to filter the details. Muted dates have no activity. On smaller screens, scroll the calendar horizontally.</p><div className="-mx-1 overflow-x-auto px-1"><table className="w-full min-w-[20rem] table-fixed border-separate border-spacing-1" aria-describedby="calendar-instructions"><caption className="sr-only">Activity calendar for {monthHeading.format(new Date(Date.UTC(year, month - 1, 1)))}</caption><thead><tr className="text-center text-xs font-semibold uppercase tracking-[0.06em] text-black/55">{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => <th key={day} scope="col" abbr={day} className="py-2"><span aria-hidden="true">{day.slice(0, 2)}</span><span className="sr-only">{day}</span></th>)}</tr></thead><tbody>{calendarWeeks.map((week, weekIndex) => <tr key={`week-${weekIndex}`}>{week.map((day, dayIndex) => {
          if (day === null) return <td key={`empty-${weekIndex}-${dayIndex}`} aria-hidden="true" />;
          const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayActivities = activityByDay.get(key) ?? [];
          const isToday = year === today.year && month === today.month && day === today.day;
          const statusLabels = dayActivities.map((item) => statusStyle[activityStatus(item, now.getTime())].label);
          const label = `${monthHeading.format(new Date(Date.UTC(year, month - 1, 1))).split(" ")[0]} ${day}${isToday ? ", today" : ""}: ${dayActivities.length ? statusLabels.join(", ") : "No activity"}`;
          const selected = selectedDay === key;
          const dayContent = <><span className={`inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold ${selected ? "bg-[#c72c25] text-white" : isToday ? "ring-2 ring-black/35 ring-offset-1" : ""}`}>{day}</span><span className="mt-1 flex flex-wrap items-center gap-1" aria-hidden="true">{dayActivities.slice(0, 4).map((item) => <span key={item.reservation_id} className={`size-2 rounded-full ${statusStyle[activityStatus(item, now.getTime())].dot}`} />)}{dayActivities.length > 4 ? <span className="text-[0.65rem] font-semibold text-black/60">+{dayActivities.length - 4}</span> : null}</span></>;
          const dayClassName = `flex min-h-16 w-full min-w-11 flex-col rounded-xl border p-1.5 text-left sm:min-h-24 sm:p-2 ${selected ? "border-[#c72c25] bg-white shadow-[0_0.5rem_1.5rem_rgba(199,44,37,0.14)]" : isToday ? "border-black/20 bg-white/80" : dayActivities.length ? "border-white/70 bg-white/55" : "border-transparent bg-white/25 text-black/60"}`;
          const cell = dayActivities.length ? <Link href={`/member/reservations?month=${viewedMonth}&day=${key}#month-details`} aria-label={`${label}.${selected ? " Selected." : " View details."}`} aria-current={selected ? "date" : undefined} className={`${dayClassName} transition hover:border-[#c72c25]/70 hover:bg-white/85 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2`}>{dayContent}</Link> : <div className={dayClassName}><span className="sr-only">{label}</span>{dayContent}</div>;
          return <td key={key} className="p-0 align-top">{cell}</td>;
        })}</tr>)}</tbody></table></div><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-black/10 pt-4 text-xs text-black/65">{(["attended", "no_show", "pending", "cancelled", "studio_cancelled"] as const).map((status) => <span key={status} className="inline-flex items-center gap-1.5"><span className={`size-2 rounded-full ${statusStyle[status].dot}`} aria-hidden="true" />{statusStyle[status].label}</span>)}</div></>}
      </section>

      <section className="rounded-3xl border border-white/60 bg-[linear-gradient(135deg,rgba(23,23,23,0.96),rgba(55,48,44,0.94))] p-4 text-white shadow-[0_1rem_3rem_rgba(17,17,17,0.16),inset_0_1px_0_rgba(255,255,255,0.12)] sm:p-6 xl:sticky xl:top-6" aria-labelledby="activity-stats">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-white/65">Your stats</p>
        <h2 id="activity-stats" className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Consistency at a glance</h2>
        {statsError || !stats ? <p role="alert" className="mt-4 rounded-2xl border border-white/15 bg-white/8 p-4 text-sm text-white/75">Your activity statistics could not be loaded. Refresh and try again.</p> : <dl className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-white/15 bg-white/8 p-4 backdrop-blur-xl"><dt className="text-sm text-white/70">Total check-ins</dt><dd className="mt-2 text-4xl font-semibold tracking-[-0.05em]">{stats.total_check_ins}</dd><p className="mt-1 text-xs text-white/55">All attended classes</p></div><div className="rounded-2xl border border-white/15 bg-white/8 p-4 backdrop-blur-xl"><dt className="text-sm text-white/70">Attended this month</dt><dd className="mt-2 text-4xl font-semibold tracking-[-0.05em]">{stats.classes_this_month}</dd><p className="mt-1 text-xs text-white/55">In {monthHeading.format(new Date(Date.UTC(year, month - 1, 1)))}</p></div></dl>}
      </section>
      </div>

      {!error && <section id="month-details" className="mt-4 scroll-mt-6" aria-labelledby="month-details-heading"><div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><p className="font-mono text-xs uppercase tracking-[0.15em] text-black/60">{selectedDay ? "Selected date" : "Monthly detail"}</p><h2 id="month-details-heading" className="mt-1 text-2xl font-semibold" aria-live="polite">{selectedDateHeading ? `Classes on ${selectedDateHeading}` : "Attendance and outcomes"}</h2></div><div className="flex items-center gap-3"><span className="text-sm text-black/60">{selectedDay ? visibleActivityDays[0][1].length : activities.length} {(selectedDay ? visibleActivityDays[0][1].length : activities.length) === 1 ? "entry" : "entries"}</span>{selectedDay ? <Link href={`/member/reservations?month=${viewedMonth}#month-details`} className="inline-flex min-h-11 items-center rounded-full border border-black/15 bg-white/65 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Show full month</Link> : null}</div></div>{activities.length === 0 ? <div className="rounded-3xl border border-white/60 bg-white/55 p-6 text-center backdrop-blur-xl"><h3 className="text-xl font-semibold">No activity this month</h3><p className="mt-2 text-sm text-black/65">Completed classes and attendance outcomes will appear here.</p><Link href="/member/classes" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-black px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Find a class</Link></div> : <div className="space-y-5">{visibleActivityDays.map(([key, dayActivities]) => <section key={key} aria-labelledby={`detail-${key}`}><h3 id={`detail-${key}`} className="mb-2 text-base font-semibold">{dayHeading.format(new Date(dayActivities[0].starts_at))}</h3><div className="grid gap-3 xl:grid-cols-2">{dayActivities.map((activity) => {
          const status = activityStatus(activity, now.getTime());
          const style = statusStyle[status];
          return <article key={activity.reservation_id} className="rounded-2xl border border-white/70 bg-white/62 p-4 shadow-[0_0.75rem_2rem_rgba(17,17,17,0.06),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-xl"><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="text-lg font-semibold">{classNames[activity.class_type] ?? activity.class_type_label}</h4><p className="mt-1 text-sm text-black/65">{activity.class_type_label} · {timeFormatter.format(new Date(activity.starts_at))} · with {activity.instructor_name}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${style.badge}`}>{style.label}</span></div></article>;
        })}</div></section>)}</div>}</section>}
    </PortalShell>
  );
}
