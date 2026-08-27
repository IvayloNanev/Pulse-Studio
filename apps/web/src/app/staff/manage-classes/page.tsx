import { MemberStatusMessage } from "@/components/member-status-message";
import { PortalShell } from "@/components/portal-shell";
import { StaffClassManagement, type ManageableClass } from "@/components/staff-class-management";
import { requireStaff } from "@/lib/auth";
import { staffLinks } from "@/lib/staff-navigation";

type StaffAccount = { role: "owner_admin" | "instructor" };
type StaffSessionRow = { class_session_id: string; class_type: "yoga" | "cycling" | "hiit"; starts_at: string; ends_at: string; instructor_name: string; instructor_staff_id: string; capacity: number; confirmed_reservations: number; waitlisted_reservations: number; marked_count: number; is_cancelled: boolean };
type InstructorOption = { staff_id: string; first_name: string; last_name: string };

const classNames = { yoga: "Yoga", cycling: "Cycling", hiit: "HIIT" };

export default async function ManageClassesPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const messages = await searchParams;
  const { supabase, staffId } = await requireStaff();
  const now = new Date();
  const [accountResult, sessionsResult, instructorsResult] = await Promise.all([
    supabase.from("staff_accounts").select("role").eq("staff_id", staffId).single(),
    supabase.from("staff_product_b_sessions").select("class_session_id,class_type,starts_at,ends_at,instructor_name,instructor_staff_id,capacity,confirmed_reservations,waitlisted_reservations,marked_count,is_cancelled").neq("instructor_name", "EOD Assigned Fixture").gt("starts_at", now.toISOString()).order("starts_at", { ascending: true }),
    supabase.from("staff_accounts").select("staff_id,first_name,last_name").eq("account_status", "active").eq("role", "instructor").order("last_name", { ascending: true }),
  ]);
  const account = accountResult.data as StaffAccount | null;
  const sessions = ((sessionsResult.data ?? []) as StaffSessionRow[]).filter((session) => !session.is_cancelled && session.marked_count === 0).slice(0, 30).map((session): ManageableClass => ({ id: session.class_session_id, name: classNames[session.class_type], startsAt: session.starts_at, endsAt: session.ends_at, instructor: session.instructor_name, instructorId: session.instructor_staff_id, capacity: session.capacity, confirmed: session.confirmed_reservations, waitlisted: session.waitlisted_reservations }));
  const isOwner = account?.role === "owner_admin";

  return <PortalShell audience="staff" eyebrow="Staff portal · Operations" title="Manage classes" description="Create future sessions or safely cancel an eligible upcoming class." links={staffLinks}><MemberStatusMessage success={messages.success} error={messages.error} />{!isOwner ? <div className="glass-panel rounded-3xl p-6"><h2 className="text-2xl font-semibold">Owner/admin access required</h2><p className="mt-2 text-sm text-black/65">Instructors can run rosters and attendance, but only an owner/admin can change the studio schedule.</p></div> : sessionsResult.error || instructorsResult.error ? <div role="alert" className="rounded-2xl border border-black/15 bg-white/65 p-6 text-sm text-[#8e211c]">Class management is temporarily unavailable. Refresh and try again.</div> : <StaffClassManagement instructors={(instructorsResult.data ?? []) as InstructorOption[]} sessions={sessions} />}</PortalShell>;
}
