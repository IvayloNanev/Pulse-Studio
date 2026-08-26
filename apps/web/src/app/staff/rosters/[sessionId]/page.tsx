import Link from "next/link";

import { MemberStatusMessage } from "@/components/member-status-message";
import { PortalShell } from "@/components/portal-shell";
import { StaffAttendanceActions } from "@/components/staff-attendance-actions";
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
  can_record_attended: boolean;
  can_record_no_show: boolean;
  check_in_opens_at: string;
  check_in_closes_at: string;
};

type SessionSummary = { class_session_id: string; class_type_label: string; starts_at: string; instructor_name: string };

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
              <span className="font-semibold capitalize">{member.attendance_status.replace("_", "-")}</span>
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
    supabase.from("public_class_schedule").select("class_session_id,class_type_label,starts_at,instructor_name").eq("class_session_id", sessionId).maybeSingle(),
    supabase.from("staff_session_roster").select("class_session_id,class_type_label,starts_at,reservation_id,reservation_status,member_id,member_name,attendance_status,can_record_attended,can_record_no_show,check_in_opens_at,check_in_closes_at").eq("class_session_id", sessionId).order("reservation_status", { ascending: true }).order("member_name", { ascending: true }),
  ]);
  const roster = (rosterResult.data ?? []) as RosterMember[];
  const session = sessionResult.data as SessionSummary | null;
  const confirmed = roster.filter((member) => member.reservation_status === "confirmed");
  const waitlisted = roster.filter((member) => member.reservation_status === "waitlisted");
  const dataError = sessionResult.error ?? rosterResult.error;

  return (
    <PortalShell audience="staff" eyebrow="Staff portal · Product B" title={session ? `${session.class_type_label} roster` : "Session roster"} description={session ? `${formatter.format(new Date(session.starts_at))} with ${session.instructor_name}` : "Review reservations and attendance eligibility for this session."} links={staffLinks}>
      <MemberStatusMessage success={messages.success} error={messages.error} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><Link href="/staff/rosters" className="inline-flex min-h-11 items-center rounded-full px-2 text-sm font-semibold underline decoration-[#c72c25] decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">← All sessions</Link><StaffRosterRefresh /></div>
      {dataError ? (
        <div role="alert" className="rounded-2xl border border-black/15 bg-white/65 p-6 text-sm text-[#8e211c] backdrop-blur-xl">This roster could not be loaded.</div>
      ) : !session ? (
        <div className="glass-panel rounded-3xl p-8"><h2 className="text-2xl font-semibold">Session unavailable</h2><p className="mt-2 text-sm text-black/65">This session was removed or is no longer available to staff.</p></div>
      ) : roster.length === 0 ? (
        <div className="glass-panel rounded-3xl p-8"><h2 className="text-2xl font-semibold">No attendance action required</h2><p className="mt-2 text-sm text-black/65">This class has no confirmed or waitlisted reservations. Return to Rosters to choose a populated session.</p></div>
      ) : (
        <div className="space-y-10">
          <RosterGroup title="Confirmed" description="Record attendance only when the approved window is open." members={confirmed} sessionId={sessionId} />
          <RosterGroup title="Waitlisted" description="These members remain separate until a confirmed spot becomes available." members={waitlisted} sessionId={sessionId} />
        </div>
      )}
    </PortalShell>
  );
}
