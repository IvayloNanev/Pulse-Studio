"use client";

import Link from "next/link";
import { type KeyboardEvent, useState } from "react";

import type { ProductBSession } from "@/components/staff/session-operations-card";
import { StaffUrgencyBadge, StaffWorkflowLabel } from "@/components/staff-workflow-ui";
import { getUnderbookingState } from "@/lib/product-b/underbooking";

export type CalendarSession = ProductBSession & {
  attendance_action: "attended" | "no_show" | null;
};

export type CalendarDay = {
  key: string;
  weekday: string;
  dateLabel: string;
  fullLabel: string;
  isToday: boolean;
  sessions: CalendarSession[];
};

const classNames = { yoga: "Studio Flow", cycling: "Pulse Ride", hiit: "Power Interval" };
const timeFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
type SessionSignal = { label: string; level: "urgent" | "attention" | "ready" | "informational" };

function sessionSignal(session: CalendarSession): SessionSignal {
  const underbooking = getUnderbookingState(session.confirmed_reservations, session.capacity, session.is_cancelled);
  if (session.is_cancelled) return { label: "Cancelled", level: "urgent" };
  if (session.attendance_action === "attended") return { label: "Check-in open", level: "attention" };
  if (session.attendance_action === "no_show") return { label: "No-show action", level: "attention" };
  if (session.confirmed_reservations === 0) return { label: "No reservations", level: "informational" };
  if (session.marked_count === session.confirmed_reservations) return { label: "Attendance complete", level: "ready" };
  if (underbooking.warning) return { label: "Capacity watch", level: "attention" };
  return { label: "Roster ready", level: "informational" };
}

function CompactSession({ session }: { session: CalendarSession }) {
  const signal = sessionSignal(session);
  return (
    <Link
      href={`/staff/rosters/${encodeURIComponent(session.class_session_id)}`}
      aria-label={`${classNames[session.class_type]} at ${timeFormatter.format(new Date(session.starts_at))}, ${signal.label}`}
      className="group block min-h-11 rounded-2xl border border-black/10 bg-white/70 p-3 shadow-sm transition hover:border-[#c72c25]/50 hover:bg-white focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-xs font-semibold text-black/70">{timeFormatter.format(new Date(session.starts_at))}</p>
        <span aria-hidden className="text-sm text-black/35 transition group-hover:translate-x-0.5 group-hover:text-[#c72c25]">→</span>
      </div>
      <p className="mt-1 text-sm font-semibold leading-tight">{classNames[session.class_type]}</p>
      <p className="mt-1 truncate text-xs text-black/60">{session.instructor_name}</p>
      <p className="mt-2 text-xs font-semibold text-black/70">{session.confirmed_reservations}/{session.capacity} confirmed</p>
      <div className="mt-2"><StaffUrgencyBadge level={signal.level}>{signal.label}</StaffUrgencyBadge></div>
    </Link>
  );
}

function EmptyDay() {
  return <p className="rounded-2xl border border-dashed border-black/15 px-3 py-5 text-center text-xs text-black/50">No classes this day</p>;
}

export function WeeklySchedule({ days, weekLabel, previousHref, nextHref, todayHref, filterLinks, activeClass, activeInstructor, canFilterInstructor }: {
  days: CalendarDay[];
  weekLabel: string;
  previousHref: string;
  nextHref: string;
  todayHref: string;
  filterLinks: { classType: Record<"all" | "yoga" | "cycling" | "hiit", string>; instructor: Record<"all" | "mine", string> };
  activeClass: "all" | "yoga" | "cycling" | "hiit";
  activeInstructor: "all" | "mine";
  canFilterInstructor: boolean;
}) {
  const defaultDay = days.find((day) => day.isToday && day.sessions.length)?.key ?? days.find((day) => day.sessions.length)?.key ?? days[0].key;
  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const mobileDay = days.find((day) => day.key === selectedDay) ?? days[0];
  const sessionCount = days.reduce((total, day) => total + day.sessions.length, 0);
  const hasActiveFilters = activeClass !== "all" || (canFilterInstructor && activeInstructor !== "all");

  function selectDayWithKeyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const nextIndex = event.key === "ArrowRight" ? (index + 1) % days.length
      : event.key === "ArrowLeft" ? (index - 1 + days.length) % days.length
        : event.key === "Home" ? 0
          : event.key === "End" ? days.length - 1
            : null;
    if (nextIndex === null) return;
    event.preventDefault();
    const key = days[nextIndex].key;
    setSelectedDay(key);
    document.getElementById(`schedule-day-tab-${key}`)?.focus();
  }

  return (
    <section aria-labelledby="weekly-schedule-heading">
      <div className="glass-panel rounded-3xl p-4 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <StaffWorkflowLabel product="Staff operations" workflow="Weekly schedule" />
            <h2 id="weekly-schedule-heading" className="mt-2 text-2xl font-semibold">Weekly schedule</h2>
            <p className="mt-1 text-sm text-black/65">Scan the week, then open a session for roster and attendance details.</p>
          </div>
          <nav aria-label="Week navigation" className="flex flex-wrap items-center gap-2">
            <Link href={previousHref} className="inline-flex min-h-11 items-center rounded-full border border-black/15 bg-white/70 px-4 text-sm font-semibold hover:border-black/30 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">‹ Previous</Link>
            <p className="min-w-32 text-center text-sm font-semibold" aria-live="polite">{weekLabel}</p>
            <Link href={todayHref} className="inline-flex min-h-11 items-center rounded-full bg-black px-4 text-sm font-semibold text-white hover:bg-[#c72c25] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Today</Link>
            <Link href={nextHref} className="inline-flex min-h-11 items-center rounded-full border border-black/15 bg-white/70 px-4 text-sm font-semibold hover:border-black/30 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Next ›</Link>
          </nav>
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-black/10 pt-5 sm:flex-row sm:items-end sm:justify-between">
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-[0.1em] text-black/55">Class type</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["all", "yoga", "cycling", "hiit"] as const).map((type) => <Link key={type} href={filterLinks.classType[type]} aria-current={activeClass === type ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 ${activeClass === type ? "bg-[#c72c25] text-white" : "border border-black/15 bg-white/65"}`}>{type === "all" ? "All" : type === "hiit" ? "HIIT" : type[0].toUpperCase() + type.slice(1)}</Link>)}
            </div>
          </fieldset>
          {canFilterInstructor ? <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-[0.1em] text-black/55">Instructor</legend>
              <div className="mt-2 flex gap-2">
                {(["all", "mine"] as const).map((value) => <Link key={value} href={filterLinks.instructor[value]} aria-current={activeInstructor === value ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 ${activeInstructor === value ? "bg-black text-white" : "border border-black/15 bg-white/65"}`}>{value === "all" ? "All instructors" : "My sessions"}</Link>)}
              </div>
            </fieldset> : <p className="text-sm font-semibold text-black/60">Showing your assigned sessions</p>}
        </div>

        <p className="mt-4 text-sm text-black/60">{sessionCount === 0 ? hasActiveFilters ? "No classes match these filters." : "No authorized sessions this week." : `${sessionCount} ${sessionCount === 1 ? "session" : "sessions"} this week`}</p>

        <div className="mt-4 hidden overflow-x-auto pb-2 md:block" data-testid="desktop-week-grid" role="region" aria-label="Seven-day schedule; scroll horizontally on smaller screens" tabIndex={0}>
          <div className="grid min-w-[70rem] grid-cols-7 gap-3 lg:min-w-0">
            {days.map((day) => (
              <section key={day.key} aria-labelledby={`desktop-${day.key}`} className={`min-w-0 rounded-2xl border p-2 ${day.isToday ? "border-[#c72c25]/40 bg-[#c72c25]/5" : "border-black/10 bg-white/35"}`}>
                <h3 id={`desktop-${day.key}`} className="mb-3 px-1 py-1 text-sm font-semibold"><span className="block">{day.weekday}</span><span className="text-xs font-normal text-black/55">{day.dateLabel}{day.isToday ? " · Today" : ""}</span></h3>
                <div className="space-y-2">{day.sessions.length ? day.sessions.map((session) => <CompactSession key={session.class_session_id} session={session} />) : <EmptyDay />}</div>
              </section>
            ))}
          </div>
        </div>

        <div className="mt-4 md:hidden" data-testid="mobile-day-schedule">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="tablist" aria-label="Choose schedule day">
            {days.map((day, index) => <button key={day.key} id={`schedule-day-tab-${day.key}`} type="button" role="tab" aria-selected={selectedDay === day.key} aria-controls="mobile-day-panel" tabIndex={selectedDay === day.key ? 0 : -1} onClick={() => setSelectedDay(day.key)} onKeyDown={(event) => selectDayWithKeyboard(event, index)} className={`min-h-11 min-w-16 shrink-0 rounded-2xl px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 ${selectedDay === day.key ? "bg-[#c72c25] text-white" : "border border-black/15 bg-white/70 text-black"}`}><span className="block">{day.weekday}</span><span className="block text-xs font-normal">{day.dateLabel}</span></button>)}
          </div>
          <section id="mobile-day-panel" role="tabpanel" className="mt-4" aria-labelledby={`schedule-day-tab-${mobileDay.key}`}>
            <h3 className="text-lg font-semibold">{mobileDay.fullLabel}{mobileDay.isToday ? " · Today" : ""}</h3>
            <div className="mt-3 space-y-3">{mobileDay.sessions.length ? mobileDay.sessions.map((session) => <CompactSession key={session.class_session_id} session={session} />) : <EmptyDay />}</div>
          </section>
        </div>
      </div>
    </section>
  );
}
