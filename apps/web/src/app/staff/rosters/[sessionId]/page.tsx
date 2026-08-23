import Link from "next/link";

import { recordAttendance } from "@/app/staff/actions";
import { MemberStatusMessage } from "@/components/member-status-message";
import { PortalShell } from "@/components/portal-shell";
import { requireStaff } from "@/lib/auth";

const links = [
  { href: "/staff", label: "Overview" },
  { href: "/staff/rosters", label: "Rosters" },
  { href: "/staff/retention", label: "Member retention" },
];

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

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "long",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function StaffRosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { sessionId } = await params;
  const messages = await searchParams;
  const { supabase } = await requireStaff();
  const { data, error } = await supabase
    .from("staff_session_roster")
    .select("class_session_id,class_type_label,starts_at,reservation_id,reservation_status,member_id,member_name,attendance_status,can_record_attended,can_record_no_show,check_in_opens_at,check_in_closes_at")
    .eq("class_session_id", sessionId)
    .order("reservation_status", { ascending: true })
    .order("member_name", { ascending: true });
  const roster = (data ?? []) as RosterMember[];
  const session = roster[0];

  return (
    <PortalShell eyebrow="Staff portal · Product B" title={session ? `${session.class_type_label} roster` : "Session roster"} description={session ? formatter.format(new Date(session.starts_at)) : "Review reservations and attendance eligibility for this session."} links={links}>
      <MemberStatusMessage success={messages.success} error={messages.error} />
      <Link href="/staff/rosters" className="mb-6 inline-flex text-sm font-semibold underline underline-offset-4">← All sessions</Link>
      {error ? (
        <div role="alert" className="border border-[#c72c25]/35 bg-[#c72c25]/5 p-6 text-sm text-[#8e211c]">This roster could not be loaded.</div>
      ) : roster.length === 0 ? (
        <div className="glass-panel rounded-3xl p-8"><h2 className="text-2xl font-semibold">No reservations yet</h2><p className="mt-2 text-sm text-black/60">This session currently has no confirmed or waitlisted members.</p></div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/45 shadow-xl backdrop-blur-2xl">
          <div className="hidden grid-cols-[1fr_9rem_12rem] gap-4 border-b border-black/10 px-6 py-4 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-black/50 md:grid">
            <span>Member</span><span>Status</span><span>Attendance</span>
          </div>
          {roster.map((member) => (
            <article key={member.reservation_id} className="grid gap-4 border-b border-black/10 px-6 py-5 last:border-b-0 md:grid-cols-[1fr_9rem_12rem] md:items-center">
              <div><h2 className="font-semibold">{member.member_name}</h2><p className="mt-1 font-mono text-[0.65rem] text-black/45">{member.member_id}</p></div>
              <span className="w-fit border border-black/20 px-2.5 py-1 text-xs font-semibold capitalize">{member.reservation_status}</span>
              {member.attendance_status ? (
                <span className="font-semibold capitalize">{member.attendance_status.replace("_", "-")}</span>
              ) : member.reservation_status === "waitlisted" ? (
                <span className="text-sm text-black/50">Awaiting promotion</span>
              ) : (
                <form action={recordAttendance} className="flex gap-2">
                  <input type="hidden" name="class_session_id" value={sessionId} />
                  <input type="hidden" name="reservation_id" value={member.reservation_id} />
                  <button type="submit" name="attendance_status" value="attended" disabled={!member.can_record_attended} title={member.can_record_attended ? "Record check-in" : `Check-in opens ${formatter.format(new Date(member.check_in_opens_at))}`} className="min-h-11 border border-black px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-35">Attended</button>
                  <button type="submit" name="attendance_status" value="no_show" disabled={!member.can_record_no_show} title={member.can_record_no_show ? "Record no-show" : `Available after ${formatter.format(new Date(member.check_in_closes_at))}`} className="min-h-11 border border-[#c72c25] px-3 text-xs font-semibold text-[#a9231e] disabled:cursor-not-allowed disabled:opacity-35">No-show</button>
                </form>
              )}
            </article>
          ))}
        </div>
      )}
    </PortalShell>
  );
}

