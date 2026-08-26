import Link from "next/link";

import { PortalShell } from "@/components/portal-shell";
import { StaffRosterRefresh } from "@/components/staff-roster-refresh";
import { StaffReason, StaffUrgencyBadge, StaffWorkflowLabel } from "@/components/staff-workflow-ui";
import { requireStaff } from "@/lib/auth";
import { staffLinks } from "@/lib/staff-navigation";

type StaffSession = {
  class_session_id: string;
  class_type: "yoga" | "cycling" | "hiit";
  class_type_label: string;
  starts_at: string;
  capacity: number;
  confirmed_reservations: number;
  waitlisted_reservations: number;
  available_spots: number;
  instructor_name: string;
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

function SessionCard({ session, actionable }: { session: StaffSession; actionable: "attended" | "no_show" | null }) {
  const startsAt = new Date(session.starts_at);
  const checkInOpensAt = new Date(startsAt.getTime() - 15 * 60 * 1000);
  const hasRoster = session.confirmed_reservations + session.waitlisted_reservations > 0;
  const timingLabel = !hasRoster
    ? "No reservations"
    : actionable === "attended"
      ? "Check-in open"
      : actionable === "no_show"
        ? "No-show recording available"
        : `Check-in opens ${timeFormatter.format(checkInOpensAt)}`;

  return (
    <article className="glass-panel grid h-full gap-5 rounded-3xl p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <StaffWorkflowLabel product="Product B" workflow="Roster & attendance" />
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

export default async function StaffRostersPage() {
  const { supabase } = await requireStaff();
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const through = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const [scheduleResult, eligibilityResult] = await Promise.all([
    supabase.from("staff_product_b_sessions").select("class_session_id,class_type,class_type_label,starts_at,capacity,confirmed_reservations,waitlisted_reservations,available_spots,instructor_name").gte("starts_at", since.toISOString()).lt("starts_at", through.toISOString()).order("starts_at", { ascending: true }),
    supabase.from("staff_session_roster").select("class_session_id,attendance_status,reservation_status,can_record_attended,can_record_no_show,starts_at").gte("starts_at", since.toISOString()).lt("starts_at", through.toISOString()),
  ]);
  const sessions = (scheduleResult.data ?? []) as StaffSession[];
  const eligibility = (eligibilityResult.data ?? []) as AttendanceEligibility[];
  const actionBySession = new Map<string, "attended" | "no_show">();
  for (const item of eligibility) {
    if (item.reservation_status !== "confirmed" || item.attendance_status) continue;
    if (item.can_record_attended) actionBySession.set(item.class_session_id, "attended");
    else if (item.can_record_no_show && !actionBySession.has(item.class_session_id)) actionBySession.set(item.class_session_id, "no_show");
  }
  const todayKey = dayKeyFormatter.format(now);
  const needsAttention = sessions.filter((session) => actionBySession.has(session.class_session_id));
  const today = sessions.filter((session) => dayKeyFormatter.format(new Date(session.starts_at)) === todayKey && !actionBySession.has(session.class_session_id));
  const upcoming = sessions.filter((session) => dayKeyFormatter.format(new Date(session.starts_at)) !== todayKey && new Date(session.starts_at) > now && !actionBySession.has(session.class_session_id));
  const dataError = scheduleResult.error ?? eligibilityResult.error;

  return (
    <PortalShell audience="staff" eyebrow="Staff portal · Product B" title="Class rosters" description="See what needs action now, manage today’s reservations, and prepare for upcoming sessions." links={staffLinks}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><StaffRosterRefresh /><p className="text-xs font-semibold text-black/60">New York time</p></div>
      {dataError ? (
        <div role="alert" className="rounded-2xl border border-black/15 bg-white/65 p-6 text-sm text-[#8e211c] backdrop-blur-xl">The staff schedule could not be loaded.</div>
      ) : sessions.length === 0 ? (
        <div className="glass-panel rounded-3xl p-8"><h2 className="text-2xl font-semibold">No roster work scheduled</h2><p className="mt-2 text-sm text-black/65">There are no sessions from the last 24 hours through the next 30 days.</p></div>
      ) : (
        <div className="space-y-10">
          {needsAttention.length ? (
            <SessionSection title="Needs attention" description="Attendance or no-show recording is available now." sessions={needsAttention} actionBySession={actionBySession} />
          ) : (
            <section aria-labelledby="needs-attention-heading">
              <h2 id="needs-attention-heading" className="text-2xl font-semibold">Needs attention</h2>
              <div className="mt-4 rounded-3xl border border-black/10 bg-white/55 p-5 shadow-sm backdrop-blur-xl sm:p-6">
                <p className="font-semibold">No attendance actions right now</p>
                <p className="mt-1 text-sm text-black/65">This page will surface check-ins and eligible no-shows as their recording windows open.</p>
              </div>
            </section>
          )}
          <SessionSection title="Today" description="Today’s remaining sessions and roster readiness." sessions={today} actionBySession={actionBySession} />
          <SessionSection title="Upcoming" description="Future sessions with reservations appear first; empty sessions remain informational." sessions={upcoming} actionBySession={actionBySession} />
        </div>
      )}
    </PortalShell>
  );
}
