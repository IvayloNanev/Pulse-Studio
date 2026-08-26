"use client";

import { useState } from "react";

export type StaffOverviewSession = {
  id: string;
  name: string;
  startsAt: string;
  instructor: string;
  confirmed: number;
  capacity: number;
  waitlisted: number;
};

type StaffOverviewProps = {
  dateLabel: string;
  todayKey: string;
  staffName: string;
  staffRole: string;
  sessions: StaffOverviewSession[];
  scheduleError?: boolean;
  allowInstructorFilter?: boolean;
  preview?: boolean;
};

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
});
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
const weekdayFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" });
const calendarDateFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" });

function sessionAccent(name: string) {
  if (name === "Studio Flow") return "border-l-emerald-700";
  if (name === "Pulse Ride") return "border-l-[#c72c25]";
  return "border-l-amber-600";
}

function sessionFill(name: string) {
  if (name === "Studio Flow") return "bg-emerald-700";
  if (name === "Pulse Ride") return "bg-[#c72c25]";
  return "bg-amber-600";
}

export function StaffOverview({
  dateLabel,
  todayKey,
  staffName,
  staffRole,
  sessions,
  scheduleError = false,
  allowInstructorFilter = false,
  preview = false,
}: StaffOverviewProps) {
  const [selectedInstructor, setSelectedInstructor] = useState("all");
  const instructors = Array.from(new Set(sessions.map((session) => session.instructor))).sort((a, b) => a.localeCompare(b));
  const visibleSessions = selectedInstructor === "all" ? sessions : sessions.filter((session) => session.instructor === selectedInstructor);
  const [year, month, day] = todayKey.split("-").map(Number);
  const calendarAnchor = new Date(Date.UTC(year, month - 1, day, 16));
  const calendarDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(calendarAnchor.getTime() + index * 24 * 60 * 60 * 1000);
    const key = dayKeyFormatter.format(date);
    return { date, key, sessions: visibleSessions.filter((session) => dayKeyFormatter.format(new Date(session.startsAt)) === key) };
  });
  const totalConfirmed = visibleSessions.reduce((total, session) => total + session.confirmed, 0);
  const totalCapacity = visibleSessions.reduce((total, session) => total + session.capacity, 0);
  const totalWaitlisted = visibleSessions.reduce((total, session) => total + session.waitlisted, 0);
  const utilization = totalCapacity > 0 ? Math.round((totalConfirmed / totalCapacity) * 100) : 0;
  const staffInitials = staffName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

  return (
    <div className="space-y-6 lg:space-y-8">
      {preview ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-black/10 bg-white/65 px-4 py-3 text-sm text-black/70 backdrop-blur-xl">
          <p><strong className="text-black">Local preview.</strong> Representative data only; no changes are saved.</p>
          <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">Preview mode</span>
        </div>
      ) : null}

      <header className="relative isolate overflow-hidden rounded-3xl bg-[#171717] p-5 text-white shadow-[0_28px_80px_rgba(17,17,17,0.22)] sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute -right-24 -top-28 -z-10 size-80 rounded-full bg-[#c72c25]/55 blur-3xl" aria-hidden="true" />
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#ff776f]">{dateLabel} · New York</p>
            <h1 className="route-title mt-4 text-5xl sm:text-6xl">Staff overview</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">Your identity and authorized seven-day class schedule, in one place.</p>
          </div>
          <div className="glass-panel-dark flex items-center gap-3 rounded-2xl px-4 py-3 md:min-w-60">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#c72c25] text-sm font-semibold text-white" aria-hidden="true">{staffInitials}</span>
            <div className="min-w-0 md:text-right"><p className="truncate text-sm font-semibold text-white">{staffName}</p><p className="mt-1 truncate text-xs font-medium text-white/70">Signed in · {staffRole}</p></div>
          </div>
        </div>
      </header>

      <section aria-labelledby="staff-calendar-heading" className="rounded-3xl bg-[#eee6dc] p-5 shadow-[0_20px_60px_rgba(31,24,18,0.10)] sm:p-6">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)] md:items-end">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#a9231e]">Your calendar</p>
            <h2 id="staff-calendar-heading" className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Classes over the next seven days</h2>
            <p className="mt-2 text-sm text-black/65">The schedule is limited to the sessions your staff role is authorized to review.</p>
          </div>
          {!scheduleError ? (
            <div>
              {allowInstructorFilter && instructors.length > 1 ? (
                <>
                  <label htmlFor="overview-instructor" className="text-sm font-semibold">View instructor schedule</label>
                  <select id="overview-instructor" value={selectedInstructor} onChange={(event) => setSelectedInstructor(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-black/15 bg-[#f7f6f2] px-3 text-sm shadow-sm focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">
                    <option value="all">All instructors</option>
                    {instructors.map((instructor) => <option key={instructor} value={instructor}>{instructor}</option>)}
                  </select>
                </>
              ) : <p className="text-sm font-semibold text-black/60">{instructors[0] ? `${instructors[0]}'s schedule` : "Authorized schedule"}</p>}
              <p className="mt-2 text-xs font-medium text-black/60" aria-live="polite">{visibleSessions.length} class{visibleSessions.length === 1 ? "" : "es"} shown this week</p>
            </div>
          ) : null}
        </div>

        {scheduleError ? (
          <p role="alert" className="mt-5 rounded-2xl bg-[#c72c25]/8 p-4 text-sm font-medium text-[#8e211c]">Your calendar is temporarily unavailable. Use Schedule &amp; Attendance in the main menu to continue.</p>
        ) : (
          <>
          <dl className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-black p-4 text-white"><dd className="text-2xl font-semibold">{visibleSessions.length}</dd><dt className="mt-1 text-xs text-white/70">Classes this week</dt></div>
            <div className="rounded-2xl border border-black/10 bg-white/65 p-4"><dd className="text-2xl font-semibold">{totalConfirmed}</dd><dt className="mt-1 text-xs text-black/60">Confirmed bookings</dt></div>
            <div className="rounded-2xl bg-[#c72c25] p-4 text-white"><dd className="text-2xl font-semibold">{totalWaitlisted}</dd><dt className="mt-1 text-xs text-white/75">Waitlisted members</dt></div>
            <div className="rounded-2xl border border-black/10 bg-white/65 p-4"><dd className="text-2xl font-semibold">{utilization}%</dd><dt className="mt-1 text-xs text-black/60">Weekly utilization</dt></div>
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-black/10 bg-white/45 px-4 py-3 text-xs font-semibold">
            <span className="font-mono uppercase tracking-[0.12em] text-black/65">Class formats</span>
            <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-emerald-700" />Studio Flow</span>
            <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#c72c25]" />Pulse Ride</span>
            <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full bg-amber-600" />Power Interval</span>
          </div>
          <ol className="mt-4 grid auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] xl:auto-cols-auto xl:grid-flow-row xl:grid-cols-7 xl:overflow-visible xl:pb-0">
            {calendarDays.map((calendarDay) => {
              const isToday = calendarDay.key === todayKey;
              return (
                <li key={calendarDay.key} className={`min-h-52 snap-start rounded-2xl border p-3 ${isToday ? "border-black bg-[#f7f6f2] shadow-[0_12px_32px_rgba(31,24,18,0.12)]" : "border-black/10 bg-[#f7f6f2]/75"}`}>
                  <div className="flex items-start justify-between gap-2 border-b border-black/10 pb-3">
                    <div><p className={`text-xs font-semibold uppercase tracking-[0.12em] ${isToday ? "text-[#c72c25]" : "text-black/60"}`}>{isToday ? "Today" : weekdayFormatter.format(calendarDay.date)}</p><time dateTime={calendarDay.key} className="mt-1 block text-sm font-semibold">{calendarDateFormatter.format(calendarDay.date)}</time></div>
                    <span className={`rounded-full px-2 py-1 text-[0.7rem] font-semibold ${isToday ? "bg-black text-white" : "bg-white text-black/60"}`}>{calendarDay.sessions.length}</span>
                  </div>
                  {calendarDay.sessions.length ? (
                    <ul className="mt-3 space-y-2">
                      {calendarDay.sessions.map((session) => (
                        <li key={session.id} className={`rounded-xl border-l-4 bg-white/90 p-3 shadow-[0_8px_24px_rgba(31,24,18,0.06)] ${sessionAccent(session.name)}`}>
                          <SessionSummary session={session} />
                        </li>
                      ))}
                    </ul>
                  ) : <div className="mt-4 rounded-xl border border-dashed border-black/15 p-3 text-center"><span className="mx-auto block h-px w-8 bg-black/15" aria-hidden="true" /><p className="mt-3 text-xs leading-5 text-black/60">No authorized classes</p></div>}
                </li>
              );
            })}
          </ol>
          </>
        )}
      </section>

    </div>
  );
}

function SessionSummary({ session }: { session: StaffOverviewSession }) {
  return (
    <>
      <time dateTime={session.startsAt} className="font-mono text-xs font-semibold text-[#a9231e]">{timeFormatter.format(new Date(session.startsAt))}</time>
      <p className="mt-1 truncate text-sm font-semibold">{session.name}</p>
      <p className="mt-1 truncate text-xs text-black/60">{session.instructor}</p>
      <p className="mt-2 text-[0.7rem] font-medium text-black/65">{session.confirmed}/{session.capacity}{session.waitlisted > 0 ? ` · ${session.waitlisted} waiting` : ""}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10" aria-hidden="true"><span className={`block h-full rounded-full ${sessionFill(session.name)}`} style={{ width: `${session.capacity > 0 ? Math.min(100, (session.confirmed / session.capacity) * 100) : 0}%` }} /></div>
    </>
  );
}
