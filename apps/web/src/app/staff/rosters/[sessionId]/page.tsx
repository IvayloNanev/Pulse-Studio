import Link from "next/link";

import { MemberStatusMessage } from "@/components/member-status-message";
import { PortalShell } from "@/components/portal-shell";
import { StaffAttendanceActions } from "@/components/staff-attendance-actions";
import { StaffAttendanceBulkActions } from "@/components/staff-attendance-bulk-actions";
import { StaffAttendanceCorrection } from "@/components/staff-attendance-correction";
import { StaffRosterRefresh } from "@/components/staff-roster-refresh";
import { requireStaff } from "@/lib/auth";
import { staffLinks } from "@/lib/staff-navigation";

type RosterMember = {
  class_session_id: string;
  class_type_label: string;
  starts_at: string;
  reservation_id: string;
  reservation_status: "confirmed" | "waitlisted";
  member_id: string;
  member_name: string;
  attendance_status: "attended" | "no_show" | null;
  attendance_record_id: string | null;
  recorded_at: string | null;
  recorded_by_staff_name: string;
  correction_history: Array<{ correction_id: string; previous_status: "attended" | "no_show"; new_status: "attended" | "no_show"; reason: string; corrected_at: string; corrected_by_staff_name: string }>;
  can_record_attended: boolean;
  can_record_no_show: boolean;
  check_in_opens_at: string;
  check_in_closes_at: string;
};

type SessionDetail = {
  class_session_id: string;
  class_type_label: string;
  starts_at: string;
  capacity: number;
  confirmed_reservations: number;
  waitlisted_reservations: number;
  available_spots: number;
  instructor_name: string;
  is_cancelled: boolean;
};

const formatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });

function guidanceFor(member: RosterMember) {
  if (member.can_record_attended) return `Check-in is open until ${formatter.format(new Date(member.check_in_closes_at))}.`;
  if (member.can_record_no_show) return "The check-in window has closed. No-show recording is available.";
  return `Check-in opens ${formatter.format(new Date(member.check_in_opens_at))}. No-show becomes available after ${formatter.format(new Date(member.check_in_closes_at))}.`;
}

function RosterGroup({ title, description, members, sessionId }: { title: string; description: string; members: RosterMember[]; sessionId: string }) {
  if (!members.length) return null;
  return (
    <section aria-labelledby={`${title.toLowerCase()}-heading`}>
      <div className="mb-4"><h2 id={`${title.toLowerCase()}-heading`} className="text-2xl font-semibold">{title} <span className="text-black/65">{members.length}</span></h2><p className="mt-1 text-sm text-black/65">{description}</p></div>
      <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/45 shadow-xl backdrop-blur-2xl">
        {members.map((member) => (
          <article key={member.reservation_id} className="grid gap-4 border-b border-black/10 px-5 py-5 last:border-b-0 sm:px-6 lg:grid-cols-[minmax(0,1fr)_9rem_minmax(17rem,22rem)] lg:items-center">
            <div className="min-w-0"><h3 className="font-semibold">{member.member_name}</h3><p className="mt-1 font-mono text-xs text-black/60">{member.member_id}</p></div>
            <span className="w-fit rounded-full border border-black/20 bg-white/55 px-2.5 py-1 text-xs font-semibold capitalize">{member.reservation_status}</span>
            {member.attendance_status ? (
              <div>
                <p className="font-semibold capitalize">{member.attendance_status.replace("_", "-")}</p>
                <p className="mt-1 text-xs text-black/60">Recorded {member.recorded_at ? formatter.format(new Date(member.recorded_at)) : "at an unavailable time"} by {member.recorded_by_staff_name || "Recorder unavailable"}</p>
                {member.correction_history.map((correction) => (
                  <div key={correction.correction_id} className="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-950">
                    <strong>{correction.previous_status.replace("_", "-")} → {correction.new_status.replace("_", "-")}</strong> · {correction.corrected_by_staff_name} · {formatter.format(new Date(correction.corrected_at))}<br />{correction.reason}
                  </div>
                ))}
                {member.attendance_record_id ? <StaffAttendanceCorrection sessionId={sessionId} attendanceRecordId={member.attendance_record_id} currentStatus={member.attendance_status} /> : null}
              </div>
            ) : member.reservation_status === "waitlisted" ? (
              <p className="text-sm text-black/65">Awaiting promotion. Attendance is unavailable until the reservation is confirmed.</p>
            ) : (
              <StaffAttendanceActions sessionId={sessionId} reservationId={member.reservation_id} canRecordAttended={member.can_record_attended} canRecordNoShow={member.can_record_no_show} guidance={guidanceFor(member)} />
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function StaffRosterPage({ params, searchParams }: { params: Promise<{ sessionId: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const { sessionId } = await params;
  const messages = await searchParams;
  const { supabase } = await requireStaff();
  const [sessionResult, rosterResult] = await Promise.all([
    supabase.from("staff_product_b_sessions")
      .select("class_session_id,class_type_label,starts_at,capacity,confirmed_reservations,waitlisted_reservations,available_spots,instructor_name,is_cancelled")
      .eq("class_session_id", sessionId)
      .maybeSingle(),
    supabase.from("staff_session_roster")
      .select("class_session_id,class_type_label,starts_at,reservation_id,reservation_status,member_id,member_name,attendance_record_id,attendance_status,recorded_at,recorded_by_staff_name,correction_history,can_record_attended,can_record_no_show,check_in_opens_at,check_in_closes_at")
      .eq("class_session_id", sessionId)
      .order("reservation_status", { ascending: true })
      .order("member_name", { ascending: true }),
  ]);
  const session = sessionResult.data as SessionDetail | null;
  const roster = (rosterResult.data ?? []) as RosterMember[];
  const confirmed = roster.filter((member) => member.reservation_status === "confirmed");
  const waitlisted = roster.filter((member) => member.reservation_status === "waitlisted");
  const attended = confirmed.filter((member) => member.attendance_status === "attended").length;
  const noShow = confirmed.filter((member) => member.attendance_status === "no_show").length;
  const marked = attended + noShow;
  const unmarked = confirmed.length - marked;
  const lifecycle = session?.is_cancelled ? "Cancelled session" : confirmed.length === 0 ? "No roster to process" : marked === 0 ? "Attendance not started" : marked === confirmed.length ? "Attendance complete" : "Attendance in progress";
  const bulkTargets = confirmed.filter((member) => !member.attendance_status && (member.can_record_attended || member.can_record_no_show)).map((member) => ({ reservationId: member.reservation_id, memberName: member.member_name, canRecordAttended: member.can_record_attended, canRecordNoShow: member.can_record_no_show }));
  const dataError = sessionResult.error ?? rosterResult.error;

  return (
    <PortalShell audience="staff" eyebrow="Staff portal · Product B" title={session ? `${session.class_type_label} roster` : "Session roster"} description={session ? `${formatter.format(new Date(session.starts_at))} with ${session.instructor_name}` : "Review reservations and attendance eligibility for this session."} links={staffLinks}>
      <MemberStatusMessage success={messages.success} error={messages.error} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><Link href="/staff/rosters" className="inline-flex min-h-11 items-center rounded-full px-2 text-sm font-semibold underline decoration-[#c72c25] decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">← All sessions</Link><StaffRosterRefresh /></div>
      {dataError ? (
        <div role="alert" className="rounded-2xl border border-black/15 bg-white/65 p-6 text-sm text-[#8e211c] backdrop-blur-xl">This roster could not be loaded.</div>
      ) : !session ? (
        <div role="alert" className="glass-panel rounded-3xl p-8"><h2 className="text-2xl font-semibold">Session unavailable</h2><p className="mt-2 text-sm text-black/60">This session does not exist or is outside your Product B access.</p></div>
      ) : (
        <div className="space-y-10">
          <section aria-labelledby="attendance-summary-heading" className="glass-panel rounded-3xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="attendance-summary-heading" className="text-2xl font-semibold">Attendance summary</h2><p className="mt-1 text-sm font-semibold">{lifecycle}</p></div><p className="text-lg font-semibold">{marked} of {confirmed.length} marked</p></div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Confirmed" value={confirmed.length} /><Metric label="Attended" value={attended} /><Metric label="No-show" value={noShow} /><Metric label="Unmarked" value={unmarked} /></div>
            {session.is_cancelled ? <p className="mt-4 text-sm text-[#8e211c]">Attendance actions are unavailable because this session is cancelled.</p> : confirmed.length === 0 ? <p className="mt-4 text-sm text-black/65">This valid session has no confirmed reservations. No attendance records will be created.</p> : null}
          </section>
          {!session.is_cancelled ? <StaffAttendanceBulkActions sessionId={sessionId} targets={bulkTargets} /> : null}
          <RosterGroup title="Confirmed" description="Record attendance only when the approved window is open." members={confirmed} sessionId={sessionId} />
          <RosterGroup title="Waitlisted" description="These members remain separate until a confirmed spot becomes available." members={waitlisted} sessionId={sessionId} />
        </div>
      )}
    </PortalShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-black/10 bg-white/45 p-3"><p className="text-xs text-black/55">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>;
}
