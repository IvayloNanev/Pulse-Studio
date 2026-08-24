"use client";

import { CalendarDays, Check, Clock3 } from "lucide-react";
import { type ButtonHTMLAttributes, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { bookClass } from "@/app/member/actions";
import { MemberRefreshButton } from "@/components/member-refresh-button";

export type MemberDashboardSummary = {
  member_name: string;
  membership_status: string;
  plan_name: string;
  classes_per_month: number;
  classes_used: number;
  classes_reserved: number;
  classes_remaining: number;
  billing_cycle_end_at: string;
};

export type MemberDashboardSession = {
  class_session_id: string;
  class_type: "yoga" | "cycling" | "hiit";
  class_type_label: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  confirmed_reservations: number;
  waitlisted_reservations: number;
  available_spots: number;
  is_full: boolean;
  instructor_name: string;
};

export type MemberDashboardReservation = {
  reservation_id: string;
  reservation_status: "confirmed" | "waitlisted";
  class_session_id: string;
  class_type_label: string;
  starts_at: string;
  ends_at: string;
  instructor_name: string;
  cancellation_deadline: string;
};

export type MemberCalendarDay = {
  key: string;
  starts_at: string;
};

type MemberDashboardProps = {
  calendarDays: MemberCalendarDay[];
  dataFetchedAt: string;
  eligibilityError?: string;
  initialClassType?: string;
  initialDay?: string;
  initialInstructor?: string;
  monthLabel: string;
  reservationError?: string;
  reservations: MemberDashboardReservation[];
  scheduleError?: string;
  sessions: MemberDashboardSession[];
  summary?: MemberDashboardSummary;
};

const timeZone = "America/New_York";
const classNames = { yoga: "Studio Flow", cycling: "Pulse Ride", hiit: "Power Interval" };
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
const weekdayFormatter = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" });
const dayFormatter = new Intl.DateTimeFormat("en-US", { timeZone, day: "numeric" });
const monthFormatter = new Intl.DateTimeFormat("en-US", { timeZone, month: "short" });
const fullDayFormatter = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "long", day: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" });

function dayKey(value: string) {
  const parts = dayKeyFormatter.formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function contextPath(day: string, classType: string, instructor: string) {
  const query = new URLSearchParams();
  query.set("day", day);
  if (classType !== "all") query.set("class", classType);
  if (instructor !== "all") query.set("instructor", instructor);
  return `/member/classes?${query.toString()}`;
}

function DashboardActionButton({ children, className, pendingLabel = "Working…", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button {...props} disabled={pending || props.disabled} className={className} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

function RefreshSchedule({ fetchedAt }: { fetchedAt: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-black/65">
      <span>Updated {timeFormatter.format(new Date(fetchedAt))}</span>
      <MemberRefreshButton className="text-black underline decoration-[#c72c25] decoration-2 underline-offset-4" />
    </div>
  );
}

export function MemberDashboard({ calendarDays, dataFetchedAt, eligibilityError, initialClassType = "all", initialDay, initialInstructor = "all", monthLabel, reservationError, reservations, scheduleError, sessions, summary }: MemberDashboardProps) {
  const todayKey = dayKey(dataFetchedAt);
  const firstAvailableDay = calendarDays.find((date) => sessions.some((session) => dayKey(session.starts_at) === date.key && new Date(session.ends_at).getTime() > new Date(dataFetchedAt).getTime()));
  const validInitialDay = calendarDays.some((date) => date.key === initialDay) ? initialDay : undefined;
  const instructors = useMemo(() => Array.from(new Set(sessions.map((session) => session.instructor_name))).sort((a, b) => a.localeCompare(b)), [sessions]);
  const validInitialClassType = ["yoga", "cycling", "hiit"].includes(initialClassType) ? initialClassType : "all";
  const initialInstructors = validInitialClassType === "all"
    ? instructors
    : instructors.filter((instructor) => sessions.some((session) => session.class_type === validInitialClassType && session.instructor_name === instructor));
  const validInitialInstructor = initialInstructors.includes(initialInstructor) ? initialInstructor : "all";
  const [selectedDay, setSelectedDay] = useState(validInitialDay ?? firstAvailableDay?.key ?? calendarDays[0]?.key ?? "");
  const [selectedInstructor, setSelectedInstructor] = useState(validInitialInstructor);
  const [selectedClassType, setSelectedClassType] = useState(validInitialClassType);
  const classSelectRef = useRef<HTMLSelectElement>(null);
  const availableInstructors = useMemo(
    () => Array.from(new Set(sessions
      .filter((session) => selectedClassType === "all" || session.class_type === selectedClassType)
      .map((session) => session.instructor_name))).sort((a, b) => a.localeCompare(b)),
    [selectedClassType, sessions],
  );
  const filteredSessions = useMemo(() => sessions.filter((session) =>
    (selectedInstructor === "all" || session.instructor_name === selectedInstructor)
    && (selectedClassType === "all" || session.class_type === selectedClassType)), [selectedClassType, selectedInstructor, sessions]);
  const sessionsByDay = useMemo(() => {
    const groups = new Map<string, MemberDashboardSession[]>();
    filteredSessions.forEach((session) => groups.set(dayKey(session.starts_at), [...(groups.get(dayKey(session.starts_at)) ?? []), session]));
    return groups;
  }, [filteredSessions]);
  const selectedDate = calendarDays.find((date) => date.key === selectedDay) ?? calendarDays[0];
  const selectedSessions = sessionsByDay.get(selectedDay) ?? [];
  const reservationsBySession = useMemo(() => new Map(reservations.map((reservation) => [reservation.class_session_id, reservation])), [reservations]);
  const canBook = summary?.membership_status === "active";
  const filtersActive = selectedInstructor !== "all" || selectedClassType !== "all";
  const returnTo = contextPath(selectedDay, selectedClassType, selectedInstructor);

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex flex-col justify-between gap-3 rounded-3xl bg-[#171717] p-4 text-white shadow-[0_1.25rem_3rem_rgba(17,17,17,0.14)] sm:flex-row sm:items-center sm:p-5">
        <div><p className="font-mono text-xs uppercase tracking-[0.16em] text-white/65">Classes</p><h1 className="mt-1 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Find your next class</h1></div>
        <div className="flex flex-wrap items-center gap-2 text-sm">{summary ? <><span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 capitalize"><span className={`size-2 rounded-full ${canBook ? "bg-emerald-400" : "bg-amber-400"}`} aria-hidden="true" />{summary.membership_status}</span><span className="inline-flex min-h-9 items-center rounded-full border border-white/15 bg-white/8 px-3"><strong className="mr-1.5 text-base">{summary.classes_reserved}</strong> current {summary.classes_reserved === 1 ? "reservation" : "reservations"}</span><span className="inline-flex min-h-9 items-center rounded-full border border-white/15 bg-white/8 px-3"><strong className="mr-1.5 text-base">{summary.classes_remaining}</strong> classes left</span></> : <span>Booking eligibility unavailable</span>}</div>
      </header>
      {eligibilityError ? <div role="alert" className="rounded-2xl border border-[#c72c25]/25 bg-[#c72c25]/5 p-4 text-sm text-[#8e211c]">{eligibilityError} You can still browse the schedule.</div> : summary && !canBook ? <div role="status" className="rounded-2xl border border-amber-700/20 bg-amber-50 p-4 text-sm text-amber-950">Your membership is paused. You can browse the schedule, but booking remains unavailable until the membership is active.</div> : null}

      <section className="rounded-3xl border border-black/10 bg-white/65 p-4 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)] sm:p-6" aria-labelledby="schedule-title">
        <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-end">
          <div>
            <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-black/65"><CalendarDays className="size-4 text-[#c72c25]" aria-hidden="true" /> {monthLabel} class schedule</p>
            <h2 id="schedule-title" className="mt-1 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Choose a class</h2>
            <RefreshSchedule fetchedAt={dataFetchedAt} />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 sm:flex sm:items-end">
            <label className="min-w-0 text-sm font-semibold"><span className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-black/65">Class</span><select ref={classSelectRef} value={selectedClassType} onChange={(event) => { const nextClassType = event.target.value; setSelectedClassType(nextClassType); const instructorStillAvailable = sessions.some((session) => (nextClassType === "all" || session.class_type === nextClassType) && session.instructor_name === selectedInstructor); if (selectedInstructor !== "all" && !instructorStillAvailable) setSelectedInstructor("all"); }} className="min-h-11 w-full min-w-0 rounded-full border border-black/20 bg-[#f7f4ee] px-3 text-sm focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 sm:min-w-40 sm:px-4"><option value="all">All classes</option><option value="yoga">Yoga</option><option value="cycling">Cycling</option><option value="hiit">HIIT</option></select></label>
            {availableInstructors.length > 0 ? <label className="min-w-0 text-sm font-semibold"><span className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-black/65">Instructor</span><select value={selectedInstructor} onChange={(event) => setSelectedInstructor(event.target.value)} className="min-h-11 w-full min-w-0 rounded-full border border-black/20 bg-[#f7f4ee] px-3 text-sm focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 sm:min-w-48 sm:px-4"><option value="all">All instructors</option>{availableInstructors.map((instructor) => <option key={instructor} value={instructor}>{instructor}</option>)}</select></label> : null}
            {filtersActive ? <button type="button" onClick={() => { setSelectedClassType("all"); setSelectedInstructor("all"); classSelectRef.current?.focus(); }} className="col-span-2 min-h-11 justify-self-start text-sm font-semibold underline decoration-[#c72c25] decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 sm:col-auto sm:self-end">Clear filters</button> : null}
          </div>
        </div>

        <div className="relative -mx-1 mt-6">
        <div className="flex snap-x scroll-px-1 gap-2 overflow-x-auto px-1 pb-2 pr-8 xl:grid xl:grid-cols-7 xl:overflow-visible xl:pr-1 xl:[&>button]:min-w-0" aria-label="Select a day">
          {calendarDays.map((date) => {
            const selected = date.key === selectedDay;
            const sessionCount = sessionsByDay.get(date.key)?.length ?? 0;
            const parsedDate = new Date(date.starts_at);
            const isToday = date.key === todayKey;
            return <button key={date.key} type="button" aria-pressed={selected} aria-label={`${isToday ? "Today, " : ""}${fullDayFormatter.format(parsedDate)}, ${sessionCount} ${sessionCount === 1 ? "class" : "classes"}`} onClick={() => setSelectedDay(date.key)} className={`min-h-24 min-w-[5.25rem] snap-start rounded-2xl border px-3 py-3 text-center transition focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 ${selected ? "border-black bg-black text-white" : "border-black/15 bg-[#f7f4ee] text-black hover:border-black/45"}`}><span className="block text-xs font-semibold uppercase tracking-[0.1em] opacity-75">{isToday ? "Today" : weekdayFormatter.format(parsedDate)}</span><span className="mt-1 block text-xl font-semibold">{dayFormatter.format(parsedDate)}</span><span className="block text-xs uppercase tracking-[0.08em] opacity-70">{monthFormatter.format(parsedDate)}</span><span className="mt-1 block text-xs opacity-75">{sessionCount} {sessionCount === 1 ? "class" : "classes"}</span></button>;
          })}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white/90 to-transparent xl:hidden" aria-hidden="true" />
        </div>

        <div className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">{selectedDate ? fullDayFormatter.format(new Date(selectedDate.starts_at)) : "Schedule"}</h3><p className="text-sm text-black/65" aria-live="polite">{selectedSessions.length} {selectedSessions.length === 1 ? "class" : "classes"} this day · {filteredSessions.length} in {monthLabel}</p></div>
          {scheduleError ? <div role="alert" className="rounded-2xl border border-[#c72c25]/30 bg-[#c72c25]/5 p-5 text-sm text-[#8e211c]">{scheduleError}</div> : selectedSessions.length === 0 ? <div className="rounded-2xl border border-dashed border-black/25 p-7 text-center"><p className="font-semibold">{filtersActive ? "No matches for this day" : "No classes scheduled"}</p><p className="mt-1 text-sm text-black/65">{filtersActive ? "Clear the filters or choose another day." : `Scroll through ${monthLabel} and choose another available day.`}</p>{filtersActive ? <button type="button" onClick={() => { setSelectedClassType("all"); setSelectedInstructor("all"); classSelectRef.current?.focus(); }} className="mt-3 min-h-11 rounded-full border border-black/20 px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Clear filters</button> : null}</div> : (
            <div className="divide-y divide-black/10 border-y border-black/10">
              {selectedSessions.map((session) => {
                const reservation = reservationsBySession.get(session.class_session_id);
                const creditChoiceDisabled = !canBook;
                const hasCredits = (summary?.classes_remaining ?? 0) > 0;
                const sessionEnded = new Date(session.ends_at).getTime() <= new Date(dataFetchedAt).getTime();
                return <article key={session.class_session_id} className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-3 py-4 lg:grid-cols-[7rem_1fr_minmax(15rem,auto)] lg:items-center"><div><p className="font-mono text-sm font-semibold">{timeFormatter.format(new Date(session.starts_at))}</p><p className="mt-1 flex items-center gap-1 text-xs text-black/65"><Clock3 className="size-3.5" aria-hidden="true" />{Math.round((new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 60000)} min</p></div><div><div className="flex flex-wrap items-center gap-1.5"><h4 className="text-lg font-semibold tracking-[-0.03em] sm:text-xl">{classNames[session.class_type]}</h4><span className="rounded-full border border-black/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-black/65">{session.class_type_label}</span></div><p className="mt-1 text-sm text-black/65">with {session.instructor_name}</p><p className={`mt-1 text-sm font-semibold ${sessionEnded || session.is_full ? "text-black/65" : "text-[#8e211c]"}`}>{sessionEnded ? "Class ended" : session.is_full ? `${session.waitlisted_reservations} on the waitlist` : `${session.available_spots} ${session.available_spots === 1 ? "spot" : "spots"} available`}</p></div>{sessionEnded ? <div className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 bg-black/5 px-5 text-sm font-semibold text-black/55 lg:col-span-1">Past class</div> : reservation ? <div className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/15 bg-[#eee6dc] px-5 text-sm font-semibold lg:col-span-1"><Check className="size-4 text-emerald-700" aria-hidden="true" />{reservation.reservation_status === "waitlisted" ? "On waitlist" : "Reserved"}</div> : reservationError ? <p className="col-span-2 max-w-xs text-sm leading-6 text-[#8e211c] lg:col-span-1">Booking is unavailable until your reservations can be verified.</p> : <form action={bookClass} className="col-span-2 grid grid-cols-1 gap-2 lg:col-span-1 lg:max-w-sm lg:justify-self-end"><input type="hidden" name="class_session_id" value={session.class_session_id} /><input type="hidden" name="return_to" value={returnTo} />{hasCredits ? <DashboardActionButton disabled={creditChoiceDisabled} type="submit" name="use_drop_in" value="false" pendingLabel={session.is_full ? "Joining…" : "Reserving…"} className="h-full min-h-11 rounded-full bg-black px-4 text-xs font-semibold text-white transition hover:bg-[#c72c25] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-black/25 sm:text-sm">{!canBook ? "Membership paused" : session.is_full ? "Join waitlist" : "Reserve"}</DashboardActionButton> : <DashboardActionButton disabled={!canBook || !summary} type="submit" name="use_drop_in" value="true" pendingLabel={session.is_full ? "Joining…" : "Reserving…"} className="h-full min-h-11 rounded-full border border-black/25 px-4 text-xs font-semibold transition hover:border-black focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm">{!summary ? "Eligibility unavailable" : session.is_full ? "$35 only if promoted" : "Reserve · $35"}</DashboardActionButton>}</form>}</article>;
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
