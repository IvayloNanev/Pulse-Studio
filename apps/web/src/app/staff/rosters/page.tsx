import Link from "next/link";

import { StaffRosterCheckIn } from "@/components/staff-roster-check-in";
import { StaffRosterModal } from "@/components/staff-roster-modal";
import { PortalShell } from "@/components/portal-shell";
import { requireStaff } from "@/lib/auth";
import { staffLinks } from "@/lib/staff-navigation";

type Instructor = { staff_id: string; first_name: string; last_name: string };
type Session = { class_session_id: string; class_type_label: string; starts_at: string; instructor_name: string; confirmed_reservations: number; waitlisted_reservations: number; capacity: number; marked_count: number; is_cancelled: boolean };
type CurrentStaff = Instructor & { role: string };
type RosterMember = { reservation_id: string; member_name: string; reservation_status: "confirmed" | "waitlisted"; attendance_status: "attended" | "no_show" | null; can_record_attended: boolean; can_record_no_show: boolean };

const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
const timeFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
const weekdayFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric" });

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function scheduleSignal(session: Session) {
  if (session.is_cancelled) return { label: "Cancelled", style: "bg-rose-100 text-rose-800" };
  if (session.waitlisted_reservations > 0 || session.confirmed_reservations >= session.capacity) return { label: session.waitlisted_reservations > 0 ? "Waitlist" : "Full", style: "bg-amber-100 text-amber-900" };
  if (session.confirmed_reservations / session.capacity >= 0.7) return { label: "Healthy", style: "bg-teal-100 text-teal-800" };
  return { label: "Underfilled", style: "bg-amber-100 text-amber-800" };
}

function classDot(session: Session) {
  const label = session.class_type_label.toLowerCase();
  if (label.includes("yoga")) return "bg-violet-500";
  if (label.includes("cycl")) return "bg-teal-500";
  return "bg-rose-500";
}

export default async function StaffRostersPage({ searchParams }: { searchParams: Promise<{ instructor?: string; date?: string; roster?: string; success?: string; error?: string }> }) {
  const query = await searchParams;
  const { supabase, staffId } = await requireStaff();
  const today = dayFormatter.format(new Date());
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(query.date ?? "") ? query.date! : today;
  const currentMonth = startOfMonth(new Date(`${selectedDate}T12:00:00Z`));
  const nextMonth = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() + 1, 1));
  const [currentStaffResult, instructorsResult, sessionsResult] = await Promise.all([
    supabase.from("staff_accounts").select("staff_id,first_name,last_name,role").eq("staff_id", staffId).maybeSingle(),
    supabase.from("staff_accounts").select("staff_id,first_name,last_name").eq("account_status", "active").eq("role", "instructor").not("first_name", "ilike", "EOD%").not("first_name", "ilike", "Reymundo%").order("last_name", { ascending: true }),
    supabase.from("staff_product_b_sessions").select("class_session_id,class_type_label,starts_at,instructor_name,confirmed_reservations,waitlisted_reservations,capacity,marked_count,is_cancelled").gte("starts_at", currentMonth.toISOString()).lt("starts_at", nextMonth.toISOString()).order("starts_at", { ascending: true }),
  ]);
  const currentStaff = currentStaffResult.data as CurrentStaff | null;
  const instructors = Array.isArray(instructorsResult.data) ? instructorsResult.data as Instructor[] : [];
  const isOwner = currentStaff?.role === "owner_admin";
  const requestedInstructorId = isOwner ? (query.instructor ?? "all") : staffId;
  const viewingAll = isOwner && requestedInstructorId === "all";
  const selectedInstructor = instructors.find((instructor) => instructor.staff_id === requestedInstructorId) ?? (viewingAll ? undefined : instructors.find((instructor) => instructor.staff_id === staffId));
  const instructorName = selectedInstructor ? `${selectedInstructor.first_name} ${selectedInstructor.last_name}` : "";
  const operationalSessions = (Array.isArray(sessionsResult.data) ? sessionsResult.data as Session[] : []).filter((session) => !session.instructor_name.startsWith("EOD ") && session.instructor_name !== "Reymundo Bermejo");
  const scopedSessions = viewingAll ? operationalSessions : operationalSessions.filter((session) => session.instructor_name === instructorName);
  const sessions = scopedSessions.filter((session) => !session.is_cancelled);
  const todaySessions = sessions.filter((session) => dayFormatter.format(new Date(session.starts_at)) === selectedDate);
  const selectedDaySessions = scopedSessions.filter((session) => dayFormatter.format(new Date(session.starts_at)) === selectedDate);
  const dayBooked = todaySessions.reduce((total, session) => total + session.confirmed_reservations, 0);
  const dayCapacity = todaySessions.reduce((total, session) => total + session.capacity, 0);
  const dayWaitlist = todaySessions.reduce((total, session) => total + session.waitlisted_reservations, 0);
  const dayAttendancePending = todaySessions.reduce((total, session) => total + Math.max(session.confirmed_reservations - session.marked_count, 0), 0);
  const dayCancelled = selectedDaySessions.filter((session) => session.is_cancelled).length;
  const dayFillRate = dayCapacity ? Math.round((dayBooked / dayCapacity) * 100) : 0;
  const calendarScope = viewingAll ? "all" : selectedInstructor?.staff_id ?? staffId;
  const openRosterSession = todaySessions.find((session) => session.class_session_id === query.roster);
  const rosterResult = openRosterSession ? await supabase.from("staff_session_roster").select("reservation_id,member_name,reservation_status,attendance_status,can_record_attended,can_record_no_show").eq("class_session_id", openRosterSession.class_session_id).order("member_name", { ascending: true }) : null;
  const rosterMembers = ((rosterResult?.data ?? []) as RosterMember[]).filter((member) => member.reservation_status === "confirmed");
  const rosterReturnTo = `/staff/rosters?instructor=${encodeURIComponent(calendarScope)}&date=${selectedDate}&roster=${encodeURIComponent(openRosterSession?.class_session_id ?? "")}`;
  const sessionsByDay = new Map<string, Session[]>();
  for (const session of scopedSessions) {
    const key = dayFormatter.format(new Date(session.starts_at));
    const calendarSession = session.is_cancelled ? { ...session, class_type_label: `${session.class_type_label} (Cancelled)` } : session;
    sessionsByDay.set(key, [...(sessionsByDay.get(key) ?? []), calendarSession]);
  }
  const firstGridDay = addDays(currentMonth, -currentMonth.getUTCDay());
  const calendarDays = Array.from({ length: 42 }, (_, index) => addDays(firstGridDay, index));
  const previousMonth = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() - 1, 1)).toISOString().slice(0, 10);
  const nextMonthDate = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);

  return <PortalShell audience="staff" eyebrow="Staff portal · Operations" title="Schedule & attendance" description="Start with the monthly calendar, then open a day to take attendance." links={staffLinks} showHeader={false}>
<section className="staff-control-hero staff-control-hero-connected"><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#ff776f]">Schedule view</p><h2 className="route-title mt-4 text-4xl">{isOwner ? "View the studio schedule" : "View your teaching schedule"}</h2><form className={`mt-8 grid gap-4 sm:grid-cols-2 ${isOwner ? "lg:grid-cols-3" : "lg:grid-cols-2"}`} action="/staff/rosters">{isOwner ? <label className="grid gap-2 text-sm font-semibold">Instructor<select name="instructor" defaultValue={viewingAll ? "all" : selectedInstructor?.staff_id ?? "all"} className="h-11 min-h-11 sm:h-[38px] sm:min-h-[38px] w-full rounded-xl border border-white/20 bg-white px-4 py-2 font-normal text-black outline-none"><option value="all">All instructors</option>{instructors.map((instructor) => <option key={instructor.staff_id} value={instructor.staff_id}>{instructor.first_name} {instructor.last_name}</option>)}</select></label> : <input type="hidden" name="instructor" value={staffId} />}<label className="grid gap-2 text-sm font-semibold">Day<input type="date" name="date" defaultValue={selectedDate} className="h-11 min-h-11 sm:h-[38px] sm:min-h-[38px] w-full rounded-xl border border-white/20 bg-white px-4 py-2 font-normal text-black outline-none [&::-webkit-date-and-time-value]:p-0 [&::-webkit-date-and-time-value]:text-left" /></label><div className="grid gap-2"><span className="text-sm font-semibold opacity-0" aria-hidden="true">Action</span><button type="submit" className="h-11 min-h-11 sm:h-[38px] sm:min-h-[38px] w-full rounded-xl bg-[#ff776f] px-6 text-sm font-semibold text-black">Update schedule</button></div></form></section>

    {!selectedInstructor && !viewingAll ? <section className="mt-8 rounded-3xl border border-black/10 bg-white/60 p-7"><h2 className="text-2xl font-semibold">No active instructors yet</h2><p className="mt-2 text-sm text-black/65">Add an instructor before scheduling classes or taking attendance.</p></section> : <>
<section className="mt-0 rounded-b-[2rem] border border-t-0 border-white/70 bg-white/68 p-5 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)] backdrop-blur-xl sm:p-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Step 1 · Monthly calendar</p><h2 className="mt-2 text-3xl font-semibold">{currentMonth.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</h2><p className="mt-2 text-sm text-black/60">{viewingAll ? "Every instructor’s scheduled classes for the month." : `${instructorName}’s scheduled classes for the month.`}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-black/60"><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-violet-500" />Yoga</span><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-teal-500" />Cycling</span><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />HIIT</span></div></div><div className="flex gap-2"><Link href={`/staff/rosters?instructor=${encodeURIComponent(calendarScope)}&date=${previousMonth}`} className="inline-flex min-h-11 items-center rounded-full border border-black/15 bg-white px-4 text-sm font-semibold transition hover:border-black">← Previous</Link><Link href={`/staff/rosters?instructor=${encodeURIComponent(calendarScope)}&date=${nextMonthDate}`} className="inline-flex min-h-11 items-center rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:bg-[#c72c25]">Next →</Link></div></div><p className="mt-4 text-sm text-black/50 sm:hidden">Swipe sideways to see every day.</p><div className="mt-5 overflow-x-auto rounded-3xl border border-white/80 bg-white/70 p-3 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)]"><div className="min-w-[720px]"><div className="grid grid-cols-7 gap-2">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <p key={day} className="px-2 py-2 text-center font-mono text-xs font-semibold uppercase tracking-[0.12em] text-black/45">{day}</p>)}{calendarDays.map((day) => { const key = day.toISOString().slice(0, 10); const daySessions = sessionsByDay.get(key) ?? []; const isCurrentMonth = day.getUTCMonth() === currentMonth.getUTCMonth(); const isSelected = key === selectedDate; return <Link key={key} aria-current={isSelected ? "date" : undefined} href={`/staff/rosters?instructor=${encodeURIComponent(calendarScope)}&date=${key}`} className={`min-h-32 rounded-2xl border p-3 transition ${isSelected ? "border-[#ff776f] bg-[#fff0eb] text-black shadow-[0_0.6rem_1.5rem_rgba(255,119,111,0.16)]" : isCurrentMonth ? "border-black/10 bg-white/80 hover:border-violet-300" : "border-transparent bg-black/[.03] text-black/35"}`}><p className="text-sm font-semibold">{day.getUTCDate()}</p><div className="mt-2 space-y-1">{daySessions.slice(0, 3).map((session) => { const signal = scheduleSignal(session); return <p key={session.class_session_id} title={`${session.class_type_label} · ${signal.label}`} className="flex items-center gap-1.5 truncate text-[11px] font-semibold"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${classDot(session)}`} aria-hidden="true" /><span className="truncate">{timeFormatter.format(new Date(session.starts_at))} · {session.class_type_label}{viewingAll ? ` · ${session.instructor_name.split(" ")[0]}` : ""}</span></p>; })}{daySessions.length > 3 ? <p className="pl-4 text-[11px] font-semibold text-black/55">+{daySessions.length - 3} more</p> : null}</div></Link>; })}</div></div></div></section>

<section className="mt-8 border-t border-black/10 pt-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Step 2 · Attendance for selected day</p><h2 className="mt-2 text-3xl font-semibold">{weekdayFormatter.format(new Date(`${selectedDate}T12:00:00Z`))}</h2><p className="mt-2 text-sm text-black/60">{viewingAll ? `The studio has ${todaySessions.length} class${todaySessions.length === 1 ? "" : "es"} scheduled.` : `${instructorName} has ${todaySessions.length} class${todaySessions.length === 1 ? "" : "es"} scheduled.`}</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><div className="rounded-3xl border border-black/10 bg-white/70 p-4 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)]"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/55">Classes</p><p className="mt-2 text-3xl font-semibold">{todaySessions.length}</p></div><div className="rounded-3xl border border-teal-200 bg-teal-50/70 p-4 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)]"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-800">Booked · {dayFillRate}% filled</p><p className="mt-2 text-3xl font-semibold">{dayBooked} booked of {dayCapacity}</p></div><div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-4 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)]"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">Waitlist</p><p className="mt-2 text-3xl font-semibold">{dayWaitlist}</p></div><div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-4 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)]"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-800">Cancelled</p><p className="mt-2 text-3xl font-semibold">{dayCancelled}</p></div><div className={`rounded-3xl border p-4 shadow-[0_1rem_3rem_rgba(17,17,17,0.08)] ${dayAttendancePending ? "order-first border-[#ff776f] bg-[#fff0eb] sm:p-5" : "border-black/10 bg-white/70"}`}><p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/65">Attendance due</p><p className="mt-2 text-3xl font-semibold">{dayAttendancePending}</p><p className="mt-1 text-xs font-semibold text-black/60">{dayAttendancePending ? "Members still need marking" : "All attendance is complete"}</p></div></div><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{todaySessions.length ? todaySessions.map((session) => { const signal = scheduleSignal(session); return <article key={session.class_session_id} className="overflow-hidden rounded-3xl border border-white/80 bg-white/75 shadow-[0_1rem_3rem_rgba(17,17,17,0.08)]"><div className={`h-2 ${classDot(session)}`} /><div className="flex h-full flex-col items-start justify-between gap-4 p-5"><div><p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-black/50">{timeFormatter.format(new Date(session.starts_at))}{viewingAll ? ` · ${session.instructor_name}` : ""}</p><h3 className="mt-2 text-2xl font-semibold">{session.class_type_label}</h3><p className="mt-2 text-sm text-black/60">{session.confirmed_reservations}/{session.capacity} booked · {session.marked_count} attendance records completed</p></div><div className="flex flex-wrap items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${signal.style}`}>{signal.label}</span><Link href={`/staff/rosters?instructor=${encodeURIComponent(calendarScope)}&date=${selectedDate}&roster=${encodeURIComponent(session.class_session_id)}`} className="inline-flex min-h-11 items-center rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-[#c72c25]">Open roster</Link></div></div></article>; }) : <div className="rounded-3xl border border-dashed border-black/20 bg-white/55 p-7 text-sm text-black/65">No classes scheduled for this view on this day.</div>}</div></section>
{openRosterSession ? <StaffRosterModal closeHref={"/staff/rosters?instructor=" + encodeURIComponent(calendarScope) + "&date=" + selectedDate}><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#c72c25]">Live attendance</p><h2 id="quick-roster-title" className="mt-2 text-3xl font-semibold">{openRosterSession.class_type_label} roster</h2><p className="mt-1 text-sm text-black/60">Choose Here or Not here for every attendee, then save the whole roster.</p></div><Link href={"/staff/rosters?instructor=" + encodeURIComponent(calendarScope) + "&date=" + selectedDate} className="inline-flex min-h-11 items-center rounded-full border border-black/15 bg-white/70 px-4 text-sm font-semibold">Close</Link></div>{query.error ? <p role="alert" className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-800">{query.error}</p> : null}{query.success ? <p className="mt-5 rounded-2xl bg-teal-50 p-4 text-sm font-semibold text-teal-800">{query.success}</p> : null}{rosterMembers.length ? <StaffRosterCheckIn sessionId={openRosterSession.class_session_id} returnTo={rosterReturnTo} members={rosterMembers} /> : <p className="mt-6 rounded-3xl border border-white/80 bg-white/55 p-5 text-sm text-black/60">No confirmed attendees are on this roster yet.</p>}</StaffRosterModal> : null}
    </>}
  </PortalShell>;
}
