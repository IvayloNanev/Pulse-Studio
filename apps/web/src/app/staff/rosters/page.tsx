import Link from "next/link";

import { MemberStatusMessage } from "@/components/member-status-message";
import { PortalShell } from "@/components/portal-shell";
import { StaffRosterRefresh } from "@/components/staff-roster-refresh";
import { StaffReason, StaffUrgencyBadge, StaffWorkflowLabel } from "@/components/staff-workflow-ui";
import { type ProductBSession, SessionOperationsCard } from "@/components/staff/session-operations-card";
import { type CalendarDay, WeeklySchedule } from "@/components/staff/weekly-schedule";
import { requireStaff } from "@/lib/auth";
import { addCalendarDays, calendarDateForFormatting, newYorkWeekDays, newYorkWeekStart, newYorkWeekWindow } from "@/lib/product-b/staff-week";
import { getUnderbookingState } from "@/lib/product-b/underbooking";
import { staffLinks } from "@/lib/staff-navigation";

type StaffSession = ProductBSession;

type Decision = {
  decision_id: string;
  class_session_id: string;
  action: string;
  note: string | null;
  state: "open" | "resolved";
  created_at: string;
};

type AttendanceEligibility = {
  class_session_id: string;
  starts_at: string;
  attendance_status: "attended" | "no_show" | null;
  reservation_status: "confirmed" | "waitlisted";
  can_record_attended: boolean;
  can_record_no_show: boolean;
};

const names = { yoga: "Studio Flow", cycling: "Pulse Ride", hiit: "Power Interval" };
const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "long",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const timeFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
const weekdayFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" });
const calendarDayFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
const fullDayFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });

function SessionCard({ session, actionable }: { session: StaffSession; actionable: "attended" | "no_show" | null }) {
  const startsAt = new Date(session.starts_at);
  const checkInOpensAt = new Date(startsAt.getTime() - 15 * 60 * 1000);
  const hasRoster = session.confirmed_reservations + session.waitlisted_reservations > 0;
  const timingLabel = !hasRoster
    ? "No reservations"
    : session.marked_count === session.confirmed_reservations
      ? "Attendance complete"
      : session.marked_count > 0
        ? `${session.marked_count}/${session.confirmed_reservations} marked`
    : actionable === "attended"
      ? "Check-in open"
      : actionable === "no_show"
        ? "No-show recording available"
        : `Check-in opens ${timeFormatter.format(checkInOpensAt)}`;

  return (
    <article className="glass-panel grid h-full gap-5 rounded-3xl p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <StaffWorkflowLabel product="Staff operations" workflow="Roster & attendance" />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/60">{formatter.format(startsAt)}</p>
          <StaffUrgencyBadge level={actionable ? "urgent" : hasRoster ? "ready" : "informational"}>{timingLabel}</StaffUrgencyBadge>
        </div>
        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">{names[session.class_type]}</h3>
        <p className="mt-2 text-sm text-black/65">{session.class_type_label} with {session.instructor_name}</p>
        <p className="mt-1 text-sm text-black/70">{session.confirmed_reservations}/{session.capacity} confirmed · {session.waitlisted_reservations} waitlisted · {session.available_spots} open</p>
        {actionable ? <div className="mt-4"><StaffReason>{actionable === "attended" ? "The check-in window is open and attendance can be recorded now." : "The class has passed and eligible no-shows can be recorded now."}</StaffReason></div> : null}
      </div>
      {hasRoster ? (
        <Link href={`/staff/rosters/${encodeURIComponent(session.class_session_id)}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-[#c72c25] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Manage roster</Link>
      ) : (
        <p className="text-sm font-semibold text-black/60">No attendance action required</p>
      )}
    </article>
  );
}

function SessionSection({ title, description, sessions, actionBySession }: { title: string; description: string; sessions: StaffSession[]; actionBySession: Map<string, "attended" | "no_show"> }) {
  if (!sessions.length) return null;
  return (
    <section aria-labelledby={`${title.toLowerCase().replaceAll(" ", "-")}-heading`}>
      <div className="mb-4">
        <h2 id={`${title.toLowerCase().replaceAll(" ", "-")}-heading`} className="text-2xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-black/65">{description}</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {sessions.map((session) => <SessionCard key={session.class_session_id} session={session} actionable={actionBySession.get(session.class_session_id) ?? null} />)}
      </div>
    </section>
  );
}

type RosterSearchParams = { success?: string; error?: string; week?: string; class?: string; instructor?: string };

function scheduleHref(week: string, classType: string, instructor: string) {
  const params = new URLSearchParams({ week });
  if (classType !== "all") params.set("class", classType);
  if (instructor !== "all") params.set("instructor", instructor);
  return `/staff/rosters?${params.toString()}#weekly-schedule-heading`;
}

export default async function StaffRostersPage({ searchParams }: { searchParams: Promise<RosterSearchParams> }) {
  const messages = await searchParams;
  const { supabase, staffId } = await requireStaff();
  const now = new Date();
  const weekStart = newYorkWeekStart(messages.week, now);
  const weekDays = newYorkWeekDays(weekStart);
  const weekWindow = newYorkWeekWindow(weekStart);
  const activeClass = (["yoga", "cycling", "hiit"] as const).includes(messages.class as "yoga" | "cycling" | "hiit") ? messages.class as "yoga" | "cycling" | "hiit" : "all";
  const requestedInstructor = messages.instructor === "mine" ? "mine" : "all";
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const through = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const [staffResult, operationalScheduleResult, calendarScheduleResult, eligibilityResult, decisionResult] = await Promise.all([
    supabase.from("staff_accounts").select("role").eq("staff_id", staffId).single(),
    supabase.from("staff_product_b_sessions").select("class_session_id,class_type,class_type_label,starts_at,ends_at,capacity,is_cancelled,confirmed_reservations,waitlisted_reservations,available_spots,instructor_staff_id,instructor_name,attended_count,no_show_count,marked_count").gte("starts_at", since.toISOString()).lt("starts_at", through.toISOString()).order("starts_at", { ascending: true }),
    supabase.from("staff_product_b_sessions").select("class_session_id,class_type,class_type_label,starts_at,ends_at,capacity,is_cancelled,confirmed_reservations,waitlisted_reservations,available_spots,instructor_staff_id,instructor_name,attended_count,no_show_count,marked_count").gte("starts_at", weekWindow.startsAt.toISOString()).lt("starts_at", weekWindow.endsAt.toISOString()).order("starts_at", { ascending: true }),
    supabase.from("staff_session_roster").select("class_session_id,attendance_status,reservation_status,can_record_attended,can_record_no_show,starts_at").gte("starts_at", since.toISOString()).lt("starts_at", through.toISOString()),
    supabase.from("product_b_underbooking_decisions").select("decision_id,class_session_id,action,note,state,created_at").order("created_at", { ascending: false }),
  ]);
  const operationalSessions = (operationalScheduleResult.data ?? []) as StaffSession[];
  const calendarSessions = (calendarScheduleResult.data ?? []) as StaffSession[];
  const eligibility = (eligibilityResult.data ?? []) as AttendanceEligibility[];
  const decisions = (decisionResult.data ?? []) as Decision[];
  const openDecisionBySession = new Map<string, Decision>();
  const resolvedDecisionsBySession = new Map<string, Decision[]>();
  for (const decision of decisions) {
    if (decision.state === "open") openDecisionBySession.set(decision.class_session_id, decision);
    else resolvedDecisionsBySession.set(decision.class_session_id, [...(resolvedDecisionsBySession.get(decision.class_session_id) ?? []), decision]);
  }
  const canManageDecisions = staffResult.data?.role === "owner_admin";
  const actionBySession = new Map<string, "attended" | "no_show">();
  for (const item of eligibility) {
    if (item.reservation_status !== "confirmed" || item.attendance_status) continue;
    if (item.can_record_attended) actionBySession.set(item.class_session_id, "attended");
    else if (item.can_record_no_show && !actionBySession.has(item.class_session_id)) actionBySession.set(item.class_session_id, "no_show");
  }
  const todayKey = dayKeyFormatter.format(now);
  const needsAttention = operationalSessions.filter((session) => actionBySession.has(session.class_session_id));
  const capacityAttention = operationalSessions.filter((session) => getUnderbookingState(session.confirmed_reservations, session.capacity, session.is_cancelled).warning);
  const canFilterInstructor = staffResult.data?.role === "owner_admin";
  const activeInstructor = canFilterInstructor ? requestedInstructor : "mine";
  const scheduleSessions = calendarSessions.filter((session) => {
    return (activeClass === "all" || session.class_type === activeClass)
      && (activeInstructor === "all" || session.instructor_staff_id === staffId);
  });
  const calendarDays: CalendarDay[] = weekDays.map((key) => {
    const date = calendarDateForFormatting(key);
    return {
      key,
      weekday: weekdayFormatter.format(date),
      dateLabel: calendarDayFormatter.format(date),
      fullLabel: fullDayFormatter.format(date),
      isToday: key === todayKey,
      sessions: scheduleSessions.filter((session) => dayKeyFormatter.format(new Date(session.starts_at)) === key).map((session) => ({ ...session, attendance_action: actionBySession.get(session.class_session_id) ?? null })),
    };
  });
  const weekEnd = calendarDateForFormatting(addCalendarDays(weekStart, 6));
  const weekLabel = `${calendarDayFormatter.format(calendarDateForFormatting(weekStart))}–${calendarDayFormatter.format(weekEnd)}`;
  const filterLinks = {
    classType: {
      all: scheduleHref(weekStart, "all", activeInstructor),
      yoga: scheduleHref(weekStart, "yoga", activeInstructor),
      cycling: scheduleHref(weekStart, "cycling", activeInstructor),
      hiit: scheduleHref(weekStart, "hiit", activeInstructor),
    },
    instructor: {
      all: scheduleHref(weekStart, activeClass, "all"),
      mine: scheduleHref(weekStart, activeClass, "mine"),
    },
  };
  const dataError = operationalScheduleResult.error ?? calendarScheduleResult.error ?? eligibilityResult.error ?? decisionResult.error ?? staffResult.error;

  return (
    <PortalShell audience="staff" eyebrow="Staff portal · Schedule & attendance" title="Class rosters" description="See what needs action now, manage today’s reservations, and prepare for upcoming sessions." links={staffLinks}>
      <MemberStatusMessage success={messages.success} error={messages.error} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><StaffRosterRefresh /><p className="text-xs font-semibold text-black/60">New York time</p></div>
      {dataError ? (
        <div role="alert" className="rounded-2xl border border-black/15 bg-white/65 p-6 text-sm text-[#8e211c] backdrop-blur-xl">The staff schedule could not be loaded.</div>
      ) : (
        <div className="space-y-10">
          {needsAttention.length ? (
            <SessionSection title="Needs attention now" description="Attendance and no-show actions available right now." sessions={needsAttention} actionBySession={actionBySession} />
          ) : (
            <section aria-labelledby="needs-attention-heading">
              <h2 id="needs-attention-heading" className="text-2xl font-semibold">Needs attention now</h2>
              <div className="mt-4 rounded-3xl border border-black/10 bg-white/55 p-5 shadow-sm backdrop-blur-xl sm:p-6">
                <p className="font-semibold">No attendance actions right now</p>
                <p className="mt-1 text-sm text-black/65">This page will surface check-ins and eligible no-shows as their recording windows open.</p>
              </div>
            </section>
          )}
          <section aria-labelledby="capacity-attention-heading">
            <div className="mb-4"><h2 id="capacity-attention-heading" className="text-2xl font-semibold">Capacity watch</h2><p className="mt-1 text-sm text-black/65">Upcoming sessions that may need an operational decision.</p></div>
            <div role="region" aria-label="Capacity watch">
              {capacityAttention.length ? <div className="space-y-4">{capacityAttention.map((session) => <SessionOperationsCard key={session.class_session_id} session={session} openDecision={openDecisionBySession.get(session.class_session_id)} resolvedDecisions={resolvedDecisionsBySession.get(session.class_session_id) ?? []} canManageDecisions={canManageDecisions} />)}</div> : <p className="rounded-2xl border border-black/10 bg-white/40 p-5 text-sm text-black/60">No sessions currently need capacity review.</p>}
            </div>
          </section>
          <WeeklySchedule
            days={calendarDays}
            weekLabel={weekLabel}
            previousHref={scheduleHref(addCalendarDays(weekStart, -7), activeClass, activeInstructor)}
            nextHref={scheduleHref(addCalendarDays(weekStart, 7), activeClass, activeInstructor)}
            todayHref={scheduleHref(newYorkWeekStart(undefined, now), activeClass, activeInstructor)}
            filterLinks={filterLinks}
            activeClass={activeClass}
            activeInstructor={activeInstructor}
            canFilterInstructor={canFilterInstructor}
          />
        </div>
      )}
    </PortalShell>
  );
}
