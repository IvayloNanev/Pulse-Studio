import { MemberStatusMessage } from "@/components/member-status-message";
import { PortalShell } from "@/components/portal-shell";
import { StaffClassManagement, type ClassActivity, type ManageableClass } from "@/components/staff-class-management";
import { requireStaff } from "@/lib/auth";
import { staffLinks } from "@/lib/staff-navigation";

type StaffAccount = { role: "owner_admin" | "instructor" };
type StaffSessionRow = { class_session_id: string; class_type: "yoga" | "cycling" | "hiit"; starts_at: string; instructor_name: string; capacity: number; confirmed_reservations: number; waitlisted_reservations: number; marked_count: number; is_cancelled: boolean };
type InstructorOption = { staff_id: string; first_name: string; last_name: string };
type SessionActionRow = { action_id: string; class_session_id: string; action_type: "studio_cancelled" | "session_created" | "session_updated"; reason: string | null; performed_at: string; performed_by_staff_id: string };
type StaffName = { staff_id: string; first_name: string; last_name: string };

export default async function ManageClassesPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const messages = await searchParams;
  const { supabase, staffId } = await requireStaff();
  const now = new Date();
  const historyStart = new Date(now);
  historyStart.setDate(historyStart.getDate() - 30);
  const [accountResult, sessionsResult, instructorsResult, activityResult, staffNamesResult] = await Promise.all([
    supabase.from("staff_accounts").select("role").eq("staff_id", staffId).single(),
    supabase.from("staff_product_b_sessions").select("class_session_id,class_type,starts_at,instructor_name,capacity,confirmed_reservations,waitlisted_reservations,marked_count,is_cancelled").neq("instructor_name", "EOD Assigned Fixture").gte("starts_at", historyStart.toISOString()).order("starts_at", { ascending: true }),
    supabase.from("staff_accounts").select("staff_id,first_name,last_name").eq("account_status", "active").eq("role", "instructor").order("last_name", { ascending: true }),
    supabase.from("class_session_actions").select("action_id,class_session_id,action_type,reason,performed_at,performed_by_staff_id").in("action_type", ["studio_cancelled", "session_created"]).order("performed_at", { ascending: false }).limit(120),
    supabase.from("staff_accounts").select("staff_id,first_name,last_name"),
  ]);
  const account = accountResult.data as StaffAccount | null;
  const allSessions = ((sessionsResult.data ?? []) as StaffSessionRow[]).filter((session) => session.marked_count === 0);
  const sessions = allSessions
    .filter((session) => new Date(session.starts_at) > now)
    .slice(0, 60)
    .map((session): ManageableClass => ({ id: session.class_session_id, classType: session.class_type, startsAt: session.starts_at, instructor: session.instructor_name, capacity: session.capacity, confirmed: session.confirmed_reservations, waitlisted: session.waitlisted_reservations, cancelled: session.is_cancelled }));
  const sessionById = new Map(allSessions.map((session) => [session.class_session_id, session]));
  const staffNameById = new Map(((staffNamesResult.data ?? []) as StaffName[]).map((staff) => [staff.staff_id, `${staff.first_name} ${staff.last_name}`]));
  const activity = ((activityResult.data ?? []) as SessionActionRow[]).flatMap((action): ClassActivity[] => {
    const session = sessionById.get(action.class_session_id);
    if (!session) return [];
    return [{ id: action.action_id, type: action.action_type === "session_created" ? "added" : "cancelled", classType: session.class_type, startsAt: session.starts_at, instructor: session.instructor_name, capacity: session.capacity, booked: session.confirmed_reservations, reason: action.reason, performedAt: action.performed_at, performedBy: staffNameById.get(action.performed_by_staff_id) ?? action.performed_by_staff_id }];
  });

  return (
    <PortalShell audience="staff" eyebrow="Staff portal · Operations" title="Manage classes" description="Choose a format, then add capacity or safely cancel an upcoming session." links={staffLinks} showHeader={false}>
      <MemberStatusMessage success={messages.success} error={messages.error} />
      {account?.role !== "owner_admin" ? <div className="glass-panel rounded-3xl p-6"><h2 className="text-2xl font-semibold">Owner/admin access required</h2><p className="mt-2 text-sm text-black/65">Instructors can take attendance; only an owner/admin can change the studio schedule.</p></div> : sessionsResult.error || instructorsResult.error || activityResult.error || staffNamesResult.error ? <div role="alert" className="rounded-2xl border border-black/15 bg-white/65 p-6 text-sm text-[#8e211c]">Class management is temporarily unavailable. Refresh and try again.</div> : <StaffClassManagement instructors={(instructorsResult.data ?? []) as InstructorOption[]} sessions={sessions} activity={activity} />}
    </PortalShell>
  );
}
