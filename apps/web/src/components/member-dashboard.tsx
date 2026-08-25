"use client";

import { CalendarDays, Check, Clock3 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { bookClass } from "@/app/member/actions";
import { MemberRefreshButton } from "@/components/member-refresh-button";
import { MemberReservationCancellation } from "@/components/member-reservation-cancellation";

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
const classCalendarStyle = {
  yoga: { label: "Yoga", dot: "bg-emerald-600" },
  cycling: { label: "Cycling", dot: "bg-[#c72c25]" },
  hiit: { label: "HIIT", dot: "bg-[#d18b2c]" },
} as const;
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
const dayFormatter = new Intl.DateTimeFormat("en-US", { timeZone, day: "numeric" });
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

function BookingConfirmationActions({ close, pendingLabel }: { close: () => void; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return <div className="mt-5 grid gap-2 sm:grid-cols-2"><button autoFocus type="submit" disabled={pending} aria-busy={pending} className="min-h-11 rounded-full bg-[#c72c25] px-5 text-sm font-semibold text-white transition hover:bg-[#a9231e] focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 disabled:opacity-55">{pending ? pendingLabel : "Confirm booking"}</button><button type="button" disabled={pending} onClick={close} className="min-h-11 rounded-full border border-black/20 bg-white/60 px-5 text-sm font-semibold text-black focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 disabled:opacity-55">Go back</button></div>;
}

function BookingConfirmation({ canBook, hasCredits, returnTo, session, summaryAvailable }: { canBook: boolean; hasCredits: boolean; returnTo: string; session: MemberDashboardSession; summaryAvailable: boolean }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };
  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  const useDropIn = !hasCredits;
  const disabled = !canBook || (useDropIn && !summaryAvailable);
  const triggerLabel = !summaryAvailable && useDropIn ? "Eligibility unavailable" : !canBook ? "Membership paused" : session.is_full ? (useDropIn ? "$35 only if promoted" : "Join waitlist") : useDropIn ? "Reserve · $35" : "Reserve";
  const pendingLabel = session.is_full ? "Joining…" : "Reserving…";

  return <><button ref={triggerRef} type="button" disabled={disabled} onClick={() => setOpen(true)} className={`min-h-11 rounded-full px-4 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 disabled:cursor-not-allowed sm:text-sm ${hasCredits ? "bg-black text-white hover:bg-[#c72c25] disabled:bg-black/25" : "border border-black/25 hover:border-black disabled:opacity-45"}`}>{triggerLabel}</button>{open ? <div className="fixed inset-0 z-[80] grid place-items-center bg-black/20 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section role="dialog" aria-modal="true" aria-labelledby={`confirm-booking-${session.class_session_id}`} className="w-full max-w-md rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(238,230,220,0.88))] p-5 shadow-[0_2rem_5rem_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl sm:p-6"><p className="font-mono text-xs uppercase tracking-[0.16em] text-[#8e211c]">Review your selection</p><h2 id={`confirm-booking-${session.class_session_id}`} className="mt-2 text-3xl font-semibold tracking-[-0.045em]">Confirm Booking</h2><dl className="mt-5 space-y-3 rounded-2xl border border-white/75 bg-white/55 p-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-black/65">Class</dt><dd className="text-right font-semibold">{classNames[session.class_type]}</dd></div><div className="flex justify-between gap-4"><dt className="text-black/65">Instructor</dt><dd className="text-right font-semibold">{session.instructor_name}</dd></div><div className="flex justify-between gap-4"><dt className="text-black/65">Time</dt><dd className="text-right font-semibold">{fullDayFormatter.format(new Date(session.starts_at))} · {timeFormatter.format(new Date(session.starts_at))}</dd></div><div className="flex justify-between gap-4"><dt className="text-black/65">Booking</dt><dd className="text-right font-semibold">{session.is_full ? useDropIn ? "Waitlist · $35 only if promoted" : "Membership waitlist" : useDropIn ? "$35 drop-in" : "Membership credit"}</dd></div></dl><p className="mt-4 text-sm leading-6 text-black/70">{session.is_full ? "You will join the waitlist. A reservation is created only if a place becomes available." : "Your place will be reserved after you confirm."}</p><form action={bookClass}><input type="hidden" name="class_session_id" value={session.class_session_id} /><input type="hidden" name="return_to" value={returnTo} /><input type="hidden" name="use_drop_in" value={String(useDropIn)} /><BookingConfirmationActions close={close} pendingLabel={pendingLabel} /></form><p className="sr-only">Press Escape to close without booking.</p></section></div> : null}</>;
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
  const todayCalendarDay = calendarDays.find((date) => date.key === todayKey);
  const [selectedDay, setSelectedDay] = useState(validInitialDay ?? todayCalendarDay?.key ?? firstAvailableDay?.key ?? calendarDays[0]?.key ?? "");
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
  const firstWeekday = calendarDays[0] ? new Date(calendarDays[0].starts_at).getUTCDay() : 0;
  const calendarSlots = [...Array.from({ length: firstWeekday }, () => null), ...calendarDays];
  const calendarWeeks = Array.from({ length: Math.ceil(calendarSlots.length / 7) }, (_, index) => calendarSlots.slice(index * 7, index * 7 + 7));

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex flex-col justify-between gap-3 rounded-3xl bg-[#171717] p-4 text-white shadow-[0_1.25rem_3rem_rgba(17,17,17,0.14)] sm:flex-row sm:items-center sm:p-5">
        <div><p className="font-mono text-xs uppercase tracking-[0.16em] text-white/65">Classes</p><h1 className="mt-1 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Find your next class</h1></div>
        <div className="flex flex-wrap items-center gap-2 text-sm">{summary ? <><span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 capitalize"><span className={`size-2 rounded-full ${canBook ? "bg-emerald-400" : "bg-amber-400"}`} aria-hidden="true" />{summary.membership_status}</span><span className="inline-flex min-h-9 items-center rounded-full border border-white/15 bg-white/8 px-3"><strong className="mr-1.5 text-base">{summary.classes_reserved}</strong> reserved {summary.classes_reserved === 1 ? "credit" : "credits"}</span><span className="inline-flex min-h-9 items-center rounded-full border border-white/15 bg-white/8 px-3"><strong className="mr-1.5 text-base">{summary.classes_remaining}</strong> classes left</span></> : <span>Booking eligibility unavailable</span>}</div>
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

        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-black/65" aria-label="Class calendar legend">{Object.entries(classCalendarStyle).map(([type, style]) => <span key={type} className="inline-flex items-center gap-1.5"><span className={`size-2.5 rounded-full ${style.dot}`} aria-hidden="true" />{style.label}</span>)}<span className="inline-flex items-center gap-1.5"><span className="inline-flex size-3 items-center justify-center rounded-full bg-black text-[0.5rem] text-white" aria-hidden="true">✓</span>Reserved</span><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-black/20" aria-hidden="true" />Full</span></div>
          <p id="class-calendar-instructions" className="mb-2 text-xs text-black/60">Choose a date to see its classes. Each colored dot represents one scheduled class.</p>
          <div className="-mx-1 overflow-x-auto px-1"><table className="w-full min-w-[20rem] table-fixed border-separate border-spacing-1" aria-describedby="class-calendar-instructions"><caption className="sr-only">Class calendar for {monthLabel}</caption><thead><tr className="text-center text-xs font-semibold uppercase tracking-[0.06em] text-black/60">{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => <th key={day} scope="col" abbr={day} className="py-2"><span aria-hidden="true">{day.slice(0, 2)}</span><span className="sr-only">{day}</span></th>)}</tr></thead><tbody>{calendarWeeks.map((week, weekIndex) => <tr key={`class-week-${weekIndex}`}>{week.map((date, dayIndex) => {
            if (!date) return <td key={`class-empty-${weekIndex}-${dayIndex}`} aria-hidden="true" />;
            const selected = date.key === selectedDay;
            const daySessions = sessionsByDay.get(date.key) ?? [];
            const reservedCount = daySessions.filter((session) => reservationsBySession.has(session.class_session_id)).length;
            const classSummary = (["yoga", "cycling", "hiit"] as const).map((type) => {
              const count = daySessions.filter((session) => session.class_type === type).length;
              return count ? `${count} ${classCalendarStyle[type].label}` : null;
            }).filter(Boolean).join(", ");
            const parsedDate = new Date(date.starts_at);
            const isToday = date.key === todayKey;
            return <td key={date.key} className="p-0 align-top"><button type="button" aria-pressed={selected} aria-label={`${isToday ? "Today, " : ""}${fullDayFormatter.format(parsedDate)}, ${daySessions.length} ${daySessions.length === 1 ? "class" : "classes"}${classSummary ? `: ${classSummary}` : ""}${reservedCount ? `, ${reservedCount} reserved` : ""}`} onClick={() => setSelectedDay(date.key)} className={`flex min-h-20 w-full min-w-11 flex-col rounded-xl border p-1.5 text-left transition focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 sm:min-h-24 sm:p-2 ${selected ? "border-[#c72c25] bg-white text-black shadow-[0_0.5rem_1.5rem_rgba(199,44,37,0.14)] ring-1 ring-[#c72c25]/15" : daySessions.length ? "border-black/10 bg-[#f7f4ee] hover:border-[#c72c25]/55 hover:bg-white" : "border-transparent bg-black/[0.025] text-black/55"}`}><span className="flex w-full items-center justify-between gap-1"><span className={`inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold ${selected ? "bg-[#c72c25] text-white" : ""}`}>{dayFormatter.format(parsedDate)}</span>{reservedCount ? <span className="inline-flex size-5 items-center justify-center rounded-full bg-black text-[0.6rem] text-white" aria-hidden="true">✓</span> : null}</span><span className="mt-auto flex min-h-5 flex-wrap items-end gap-1" aria-hidden="true">{daySessions.slice(0, 5).map((session) => <span key={session.class_session_id} className={`size-2.5 rounded-full ${session.is_full ? "bg-black/20" : classCalendarStyle[session.class_type].dot}`} />)}{daySessions.length > 5 ? <span className="text-[0.6rem] font-semibold">+{daySessions.length - 5}</span> : null}</span></button></td>;
          })}</tr>)}</tbody></table></div>
        </div>

        <div className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">{selectedDate ? fullDayFormatter.format(new Date(selectedDate.starts_at)) : "Schedule"}</h3><p className="text-sm text-black/65" aria-live="polite">{selectedSessions.length} {selectedSessions.length === 1 ? "class" : "classes"} this day · {filteredSessions.length} in {monthLabel}</p></div>
          {scheduleError ? <div role="alert" className="rounded-2xl border border-[#c72c25]/30 bg-[#c72c25]/5 p-5 text-sm text-[#8e211c]">{scheduleError}</div> : selectedSessions.length === 0 ? <div className="rounded-2xl border border-dashed border-black/25 p-7 text-center"><p className="font-semibold">{filtersActive ? "No matches for this day" : "No classes scheduled"}</p><p className="mt-1 text-sm text-black/65">{filtersActive ? "Clear the filters or choose another day." : `Scroll through ${monthLabel} and choose another available day.`}</p>{filtersActive ? <button type="button" onClick={() => { setSelectedClassType("all"); setSelectedInstructor("all"); classSelectRef.current?.focus(); }} className="mt-3 min-h-11 rounded-full border border-black/20 px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Clear filters</button> : null}</div> : (
            <div className="divide-y divide-black/10 border-y border-black/10">
              {selectedSessions.map((session) => {
                const reservation = reservationsBySession.get(session.class_session_id);
                const hasCredits = (summary?.classes_remaining ?? 0) > 0;
                const sessionEnded = new Date(session.ends_at).getTime() <= new Date(dataFetchedAt).getTime();
                return <article key={session.class_session_id} className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-3 py-4 lg:grid-cols-[7rem_1fr_minmax(15rem,auto)] lg:items-center"><div><p className="font-mono text-sm font-semibold">{timeFormatter.format(new Date(session.starts_at))}</p><p className="mt-1 flex items-center gap-1 text-xs text-black/65"><Clock3 className="size-3.5" aria-hidden="true" />{Math.round((new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 60000)} min</p></div><div><div className="flex flex-wrap items-center gap-1.5"><h4 className="text-lg font-semibold tracking-[-0.03em] sm:text-xl">{classNames[session.class_type]}</h4><span className="rounded-full border border-black/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-black/65">{session.class_type_label}</span></div><p className="mt-1 text-sm text-black/65">with {session.instructor_name}</p><p className={`mt-1 text-sm font-semibold ${sessionEnded || session.is_full ? "text-black/65" : "text-[#8e211c]"}`}>{sessionEnded ? "Class ended" : session.is_full ? `${session.waitlisted_reservations} on the waitlist` : `${session.available_spots} ${session.available_spots === 1 ? "spot" : "spots"} available`}</p></div>{sessionEnded ? <div className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 bg-black/5 px-5 text-sm font-semibold text-black/55 lg:col-span-1">Past class</div> : reservation ? <div className="col-span-2 rounded-2xl border border-black/15 bg-[#eee6dc] p-4 lg:col-span-1 lg:max-w-sm lg:justify-self-end"><div className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black/15 bg-white/65 px-5 text-sm font-semibold"><Check className="size-4 text-emerald-700" aria-hidden="true" />{reservation.reservation_status === "waitlisted" ? "On waitlist" : "Reserved"}</div><MemberReservationCancellation reservation={reservation} returnTo={returnTo} now={dataFetchedAt} /></div> : reservationError ? <p className="col-span-2 max-w-xs text-sm leading-6 text-[#8e211c] lg:col-span-1">Booking is unavailable until your reservations can be verified.</p> : <div className="col-span-2 lg:col-span-1 lg:max-w-sm lg:justify-self-end"><BookingConfirmation canBook={canBook} hasCredits={hasCredits} returnTo={returnTo} session={session} summaryAvailable={Boolean(summary)} /></div>}</article>;
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
